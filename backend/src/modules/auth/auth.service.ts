import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { User, UserDocument } from '../users/entities/user.entity';
import { RefreshToken, RefreshTokenDocument } from './entities/refresh-token.entity';
import { Tenant, TenantDocument } from '../tenants/entities/tenant.entity';
import { Role, RoleDocument } from '../users/entities/role.entity';
import { AuditLog, AuditLogDocument } from '../../common/entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)         private userModel:   Model<UserDocument>,
    @InjectModel(RefreshToken.name) private tokenModel:  Model<RefreshTokenDocument>,
    @InjectModel(Tenant.name)       private tenantModel: Model<TenantDocument>,
    @InjectModel(Role.name)         private roleModel:   Model<RoleDocument>,
    @InjectModel(AuditLog.name)     private auditModel:  Model<AuditLogDocument>,
    private jwtService: JwtService,
    private cfg: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).lean();
    if (!user || user.status !== 'active') return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    const [role, tenant] = await Promise.all([
      this.roleModel.findOne({ id: user.roleId }).lean(),
      this.tenantModel.findOne({ id: user.tenantId }).lean(),
    ]);

    user.role = role;
    user.tenant = tenant;
    return user as User;
  }

  async login(dto: LoginDto, ip: string, userAgent: string): Promise<AuthResponse> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (user.tenant?.status === 'suspended') throw new ForbiddenException('Account suspended');
    await this.userModel.updateOne({ id: user.id }, { $set: { lastLoginAt: new Date() } });
    const tokens = await this.generateTokenPair(user, ip, userAgent);
    await this.auditModel.create({ tenantId: user.tenantId, userId: user.id, action: 'auth.login', ipAddress: ip });
    return { ...tokens, expiresIn: this.cfg.get('app.jwtExpiry', '15m'), user: this.userToDto(user) };
  }

  async refreshToken(dto: RefreshTokenDto, ip: string): Promise<AuthResponse> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const stored = await this.tokenModel.findOne({ tokenHash, revoked: false }).lean();
    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (stored.expiresAt < new Date()) {
      await this.tokenModel.updateOne({ id: stored.id }, { $set: { revoked: true } });
      throw new UnauthorizedException('Refresh token expired');
    }
    await this.tokenModel.updateOne({ id: stored.id }, { $set: { revoked: true } });

    const user = await this.userModel.findOne({ id: stored.userId }).lean();
    if (!user) throw new UnauthorizedException('User not found');
    const [role, tenant] = await Promise.all([
      this.roleModel.findOne({ id: user.roleId }).lean(),
      this.tenantModel.findOne({ id: user.tenantId }).lean(),
    ]);
    user.role = role;
    user.tenant = tenant;

    const tokens = await this.generateTokenPair(user as User, ip, '');
    return { ...tokens, expiresIn: this.cfg.get('app.jwtExpiry', '15m'), user: this.userToDto(user as User) };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.tokenModel.updateOne({ userId, tokenHash }, { $set: { revoked: true } });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenModel.updateMany({ userId, revoked: false }, { $set: { revoked: true } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!await bcrypt.compare(currentPassword, user.passwordHash)) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userModel.updateOne({ id: userId }, { $set: { passwordHash } });
    await this.logoutAll(userId);
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findOne({ id: userId }).lean();
    if (!user) throw new NotFoundException('User not found');
    const [role, tenant] = await Promise.all([
      this.roleModel.findOne({ id: user.roleId }).lean(),
      this.tenantModel.findOne({ id: user.tenantId }).lean(),
    ]);
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl, department: user.department, role: role?.name, permissions: role?.permissions || [], tenantId: user.tenantId, tenantName: tenant?.name, tenantSlug: tenant?.slug, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt };
  }

  private async generateTokenPair(user: User, ip: string, ua: string) {
    const payload: JwtPayload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role?.name, permissions: user.role?.permissions || [] };
    const accessToken  = this.jwtService.sign(payload);
    const rawRefresh   = randomBytes(64).toString('hex');
    const tokenHash    = createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt    = new Date(); expiresAt.setDate(expiresAt.getDate() + this.cfg.get<number>('app.refreshTokenDays', 30));
    await this.tokenModel.create({ userId: user.id, tokenHash, expiresAt, ipAddress: ip, userAgent: ua });
    return { accessToken, refreshToken: rawRefresh };
  }

  private userToDto(user: User) {
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role?.name, permissions: user.role?.permissions || [], tenantId: user.tenantId, tenantName: user.tenant?.name, tenantSlug: user.tenant?.slug };
  }
}

