import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserDocument } from './entities/user.entity';
import { Role, RoleDocument } from './entities/role.entity';
import { Tenant, TenantDocument } from '../tenants/entities/tenant.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)   private userModel:   Model<UserDocument>,
    @InjectModel(Role.name)   private roleModel:   Model<RoleDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async findAll(tenantId: string) {
    const users = await this.userModel.find({ tenantId }).sort({ createdAt: -1 }).lean();
    const roles = await this.roleModel.find({ tenantId }).lean();
    const roleMap = new Map(roles.map(r => [r.id, r]));

    return users.map(u => {
      u.role = roleMap.get(u.roleId);
      return this.sanitize(u);
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.userModel.findOne({ id, tenantId }).lean();
    if (!user) throw new NotFoundException('User not found');
    const role = await this.roleModel.findOne({ id: user.roleId }).lean();
    user.role = role;
    return this.sanitize(user);
  }

  async create(dto: any, tenantId: string) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase(), tenantId });
    if (existing) throw new ConflictException('Email already exists');
    const tenant = await this.tenantModel.findOne({ id: tenantId }).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    const count = await this.userModel.countDocuments({ tenantId });
    if (count >= tenant.maxUsers) throw new BadRequestException(`User limit (${tenant.maxUsers}) reached`);
    const role = await this.roleModel.findOne({ id: dto.roleId, tenantId }).lean();
    if (!role) throw new NotFoundException('Role not found');
    const passwordHash = await bcrypt.hash(dto.password || randomBytes(12).toString('hex'), 12);
    const created = await this.userModel.create({ ...dto, email: dto.email.toLowerCase(), tenantId, passwordHash, status: 'active' });
    const userObj = created.toObject();
    userObj.role = role;
    return this.sanitize(userObj);
  }

  async update(id: string, dto: any, tenantId: string) {
    const user = await this.userModel.findOne({ id, tenantId });
    if (!user) throw new NotFoundException('User not found');
    if (dto.password) { dto.passwordHash = await bcrypt.hash(dto.password, 12); delete dto.password; }
    await this.userModel.updateOne({ id, tenantId }, { $set: dto });
    return this.findOne(id, tenantId);
  }

  async deactivate(id: string, tenantId: string)  { await this.userModel.updateOne({ id, tenantId }, { $set: { status: 'inactive' } }); }
  async reactivate(id: string, tenantId: string)   { await this.userModel.updateOne({ id, tenantId }, { $set: { status: 'active' } }); }

  async invite(email: string, roleId: string, tenantId: string) {
    if (await this.userModel.findOne({ email: email.toLowerCase(), tenantId })) throw new ConflictException('Email already exists');
    const role = await this.roleModel.findOne({ id: roleId, tenantId }).lean();
    if (!role) throw new NotFoundException('Role not found');
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const user = await this.userModel.create({ email: email.toLowerCase(), tenantId, roleId, passwordHash: '', status: 'invited', inviteToken: token, inviteExpires: expires });
    return { userId: user.id, inviteToken: token, message: 'Invite created' };
  }

  async acceptInvite(token: string, password: string, firstName: string, lastName: string) {
    const user = await this.userModel.findOne({ inviteToken: token, status: 'invited' });
    if (!user) throw new NotFoundException('Invalid invite token');
    if (user.inviteExpires < new Date()) throw new BadRequestException('Invite token expired');
    const passwordHash = await bcrypt.hash(password, 12);
    await this.userModel.updateOne({ id: user.id }, { $set: { passwordHash, firstName, lastName, status: 'active', inviteToken: null, inviteExpires: null } });
    return { message: 'Account activated' };
  }

  async getRoles(tenantId: string) { return this.roleModel.find({ tenantId }).sort({ name: 1 }).lean(); }
  async getStats(tenantId: string) {
    const [total, active, inactive, invited] = await Promise.all([
      this.userModel.countDocuments({ tenantId }),
      this.userModel.countDocuments({ tenantId, status: 'active' }),
      this.userModel.countDocuments({ tenantId, status: 'inactive' }),
      this.userModel.countDocuments({ tenantId, status: 'invited' }),
    ]);
    return { total, active, inactive, invited };
  }

  private sanitize(user: User): any {
    const { passwordHash, mfaSecret, inviteToken, ...safe } = user as any;
    return safe;
  }
}

