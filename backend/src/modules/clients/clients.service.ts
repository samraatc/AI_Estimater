import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './entities/client.entity';
import { AuditLog, AuditLogDocument } from '../../common/entities/audit-log.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name)   private clientModel: Model<ClientDocument>,
    @InjectModel(AuditLog.name) private auditModel:  Model<AuditLogDocument>,
  ) {}

  async findAll(tenantId: string, query: any = {}) {
    const { search, status, page = 1, limit = 20 } = query;
    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      this.clientModel.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      this.clientModel.countDocuments(filter),
    ]);

    return { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string, tenantId: string) {
    const c = await this.clientModel.findOne({ id, tenantId }).lean();
    if (!c) throw new NotFoundException('Client not found');
    return c;
  }

  async create(dto: any, tenantId: string, userId: string) {
    if (dto.email) {
      const ex = await this.clientModel.findOne({ email: dto.email, tenantId });
      if (ex) throw new ConflictException('Client email already exists');
    }
    const created = await this.clientModel.create({ ...dto, tenantId, createdBy: userId });
    await this.auditModel.create({ tenantId, userId, action: 'client.created', entityType: 'client', entityId: created.id });
    return created.toObject();
  }

  async update(id: string, dto: any, tenantId: string, userId: string) {
    await this.findOne(id, tenantId);
    await this.clientModel.updateOne({ id, tenantId }, { $set: dto });
    return this.findOne(id, tenantId);
  }

  async delete(id: string, tenantId: string, userId: string) {
    await this.findOne(id, tenantId);
    await this.clientModel.updateOne({ id, tenantId }, { $set: { status: 'inactive' } });
  }

  async getStats(tenantId: string) {
    const [total, active] = await Promise.all([
      this.clientModel.countDocuments({ tenantId }),
      this.clientModel.countDocuments({ tenantId, status: 'active' }),
    ]);
    return { total, active, inactive: total - active };
  }
}

