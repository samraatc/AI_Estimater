import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../projects/entities/project.entity';
import { Estimation, EstimationDocument } from '../estimations/entities/estimation.entity';
import { Client, ClientDocument } from '../clients/entities/client.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Estimation.name) private estimationModel: Model<EstimationDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  async globalSearch(query: string, tenantId: string, limit = 20) {
    if (!query?.trim()) return { query, results: [], total: 0 };
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [projects, estimations, clients] = await Promise.all([
      this.projectModel
        .find({ tenantId, name: regex, deletedAt: null })
        .limit(limit)
        .lean(),
      this.estimationModel
        .find({ tenantId, title: regex })
        .limit(limit)
        .lean(),
      this.clientModel
        .find({ tenantId, $or: [{ name: regex }, { email: regex }] })
        .limit(limit)
        .lean(),
    ]);

    const formattedProjects = projects.map(p => ({ id: p.id, type: 'project', title: p.name, subtitle: p.status }));
    const formattedEstimations = estimations.map(e => ({ id: e.id, type: 'estimation', title: e.title, subtitle: e.status }));
    const formattedClients = clients.map(c => ({ id: c.id, type: 'client', title: c.name, subtitle: c.email }));

    const results = [...formattedProjects, ...formattedEstimations, ...formattedClients].slice(0, limit);
    return { query, results, total: results.length };
  }
}
