import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './entities/project.entity';
import { Client, ClientDocument } from '../clients/entities/client.entity';
import { AuditLog, AuditLogDocument } from '../../common/entities/audit-log.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)  private projectModel: Model<ProjectDocument>,
    @InjectModel(Client.name)   private clientModel:  Model<ClientDocument>,
    @InjectModel(AuditLog.name) private auditModel:   Model<AuditLogDocument>,
  ) {}

  async findAll(tenantId: string, query: any = {}) {
    const { search, status, industry, page = 1, limit = 20 } = query;
    const filter: any = { tenantId, deletedAt: null };
    if (status)   filter.status   = status;
    if (industry) filter.industry = industry;
    if (search) {
      filter.name = new RegExp(search, 'i');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [projects, total] = await Promise.all([
      this.projectModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      this.projectModel.countDocuments(filter),
    ]);

    const clientIds = projects.map(p => p.clientId).filter(Boolean);
    const clients = await this.clientModel.find({ id: { $in: clientIds } }).lean();
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const data = projects.map(p => {
      p.client = p.clientId ? clientMap.get(p.clientId) : null;
      return p;
    });

    return { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  async findOne(id: string, tenantId: string) {
    const p = await this.projectModel.findOne({ id, tenantId, deletedAt: null }).lean();
    if (!p) throw new NotFoundException('Project not found');
    if (p.clientId) {
      p.client = await this.clientModel.findOne({ id: p.clientId }).lean();
    }
    return p;
  }

  async create(dto: any, tenantId: string, userId: string) {
    const created = await this.projectModel.create({ ...dto, tenantId, createdBy: userId, status: dto.status || 'draft' });
    await this.auditModel.create({ tenantId, userId, action: 'project.created', entityType: 'project', entityId: created.id });
    return created.toObject();
  }

  async update(id: string, dto: any, tenantId: string, userId: string) {
    await this.findOne(id, tenantId);
    await this.projectModel.updateOne({ id, tenantId }, { $set: dto });
    return this.findOne(id, tenantId);
  }

  async delete(id: string, tenantId: string, userId: string) {
    await this.findOne(id, tenantId);
    await this.projectModel.updateOne({ id, tenantId }, { $set: { deletedAt: new Date() } });
  }

  async clone(id: string, tenantId: string, userId: string) {
    const source = await this.findOne(id, tenantId);
    const { _id, id: _idStr, createdAt, updatedAt, deletedAt, client, ...rest } = source as any;
    const cloned = await this.projectModel.create({ ...rest, name: `${source.name} (Copy)`, status: 'draft', aiStatus: 'pending', clonedFrom: source.id, createdBy: userId });
    return cloned.toObject();
  }

  async getStats(tenantId: string) {
    const [total, draft, active, completed] = await Promise.all([
      this.projectModel.countDocuments({ tenantId, deletedAt: null }),
      this.projectModel.countDocuments({ tenantId, status: 'draft', deletedAt: null }),
      this.projectModel.countDocuments({ tenantId, status: 'active', deletedAt: null }),
      this.projectModel.countDocuments({ tenantId, status: 'completed', deletedAt: null }),
    ]);
    return { total, draft, active, completed };
  }
}

