import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Tenant, TenantDocument } from './entities/tenant.entity';
import { Role, RoleDocument } from '../users/entities/role.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Role.name)   private roleModel:   Model<RoleDocument>,
    @InjectModel(User.name)   private userModel:   Model<UserDocument>,
  ) {}

  async provision(dto: CreateTenantDto): Promise<Tenant> {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await this.tenantModel.findOne({ slug });
    if (existing) throw new ConflictException('Organisation name already taken');

    const tenant = await this.tenantModel.create({
      name: dto.name, slug, plan: dto.plan || 'starter', status: 'active',
      schemaName: `tenant_${Date.now()}`, storageBucket: `tenant-${slug}-${Date.now()}`,
      maxUsers: this.planLimits(dto.plan).maxUsers, maxStorageGb: this.planLimits(dto.plan).maxStorageGb, aiTokenLimit: this.planLimits(dto.plan).aiTokenLimit,
    });

    const adminRole = await this.roleModel.create({ tenantId: tenant.id, name: 'company_admin', isSystem: true, permissions: ['users:read','users:write','users:delete','roles:read','roles:write','projects:read','projects:write','projects:delete','estimations:read','estimations:write','estimations:approve','quotations:read','quotations:write','quotations:send','analytics:read','pricing:read','pricing:write','settings:read','settings:write'] });
    await this.roleModel.create({ tenantId: tenant.id, name: 'estimator', isSystem: true, permissions: ['projects:read','projects:write','estimations:read','estimations:write','quotations:read','quotations:write','analytics:read','pricing:read'] });
    await this.roleModel.create({ tenantId: tenant.id, name: 'viewer', isSystem: true, permissions: ['projects:read','estimations:read','quotations:read','analytics:read'] });

    await this.userModel.create({ tenantId: tenant.id, roleId: adminRole.id, email: dto.adminEmail.toLowerCase(), passwordHash: await bcrypt.hash(dto.adminPassword, 12), firstName: dto.adminFirstName || 'Admin', lastName: dto.adminLastName || '', status: 'active' });
    this.logger.log(`Provisioned tenant: ${tenant.name}`);
    return tenant.toObject();
  }

  async findAll() {
    return this.tenantModel.find().sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string) {
    const tenant = await this.tenantModel.findOne({ id }).lean();
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async update(id: string, data: any) {
    const updated = await this.tenantModel.findOneAndUpdate({ id }, { $set: data }, { new: true }).lean();
    if (!updated) throw new NotFoundException(`Tenant ${id} not found`);
    return updated;
  }

  async suspend(id: string)    { return this.update(id, { status: 'suspended' }); }
  async reactivate(id: string) { return this.update(id, { status: 'active' }); }

  async getUsage(id: string) {
    const [userCount, tenant] = await Promise.all([this.userModel.countDocuments({ tenantId: id }), this.findOne(id)]);
    return { users: userCount, maxUsers: tenant.maxUsers, aiTokensUsed: tenant.aiTokensUsed, aiTokenLimit: tenant.aiTokenLimit, aiUsagePct: Math.round((Number(tenant.aiTokensUsed) / tenant.aiTokenLimit) * 100) };
  }

  private planLimits(plan?: string) {
    const p: Record<string,any> = { starter: { maxUsers:5, maxStorageGb:20, aiTokenLimit:1_000_000 }, professional: { maxUsers:25, maxStorageGb:100, aiTokenLimit:5_000_000 }, enterprise: { maxUsers:9999, maxStorageGb:9999, aiTokenLimit:50_000_000 } };
    return p[plan || 'starter'] || p.starter;
  }
}

