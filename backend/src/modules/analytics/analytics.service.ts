import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Estimation, EstimationDocument } from '../estimations/entities/estimation.entity';
import { Project, ProjectDocument } from '../projects/entities/project.entity';
import { Quotation, QuotationDocument } from '../quotations/entities/quotation.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Estimation.name) private estModel:   Model<EstimationDocument>,
    @InjectModel(Project.name)    private projModel:  Model<ProjectDocument>,
    @InjectModel(Quotation.name)  private quoteModel: Model<QuotationDocument>,
  ) {}

  async getDashboard(tenantId: string) {
    const [totalProjects, activeProjects, totalEstimations, totalQuotations, acceptedQuotations] = await Promise.all([
      this.projModel.countDocuments({ tenantId, deletedAt: null }),
      this.projModel.countDocuments({ tenantId, status: 'active', deletedAt: null }),
      this.estModel.countDocuments({ tenantId }),
      this.quoteModel.countDocuments({ tenantId }),
      this.quoteModel.countDocuments({ tenantId, status: 'accepted' }),
    ]);

    const acceptedQuotes = await this.quoteModel.find({ tenantId, status: 'accepted' }).lean();
    const totalRevenue = acceptedQuotes.reduce((sum, q) => sum + Number(q.finalTotal || 0), 0);

    const estimations = await this.estModel.find({ tenantId, aiConfidence: { $ne: null } }).lean();
    const avgAiConfidence = estimations.length ? Math.round(estimations.reduce((s, e) => s + Number(e.aiConfidence || 0), 0) / estimations.length) : 0;
    const aiEstCount = await this.estModel.countDocuments({ tenantId, aiModelUsed: { $exists: true, $ne: null } });

    const recent = await this.projModel.find({ tenantId, deletedAt: null }).sort({ updatedAt: -1 }).limit(5).select('id name status aiStatus industry updatedAt').lean();

    const approvedEsts = await this.estModel.find({ tenantId, status: { $in: ['approved', 'locked'] } }).lean();
    let mat = 0, lab = 0, eq = 0, tr = 0, ovh = 0;
    if (approvedEsts.length > 0) {
      approvedEsts.forEach(e => {
        mat += (Number(e.materialCost || 0) + Number(e.steelCost || 0));
        lab += Number(e.laborCost || 0);
        eq += Number(e.equipmentCost || 0);
        tr += Number(e.transportCost || 0);
        ovh += Number(e.overheadCost || 0);
      });
      const len = approvedEsts.length;
      mat /= len; lab /= len; eq /= len; tr /= len; ovh /= len;
    }

    const row = { material: mat, labor: lab, equipment: eq, transport: tr, overhead: ovh };
    const vals: number[] = Object.values(row);
    const total = vals.reduce((s, v) => s + v, 0);
    const bd = Object.entries(row).map(([k, v]) => ({ category: k, amount: Number(v) || 0, pct: total ? Math.round((Number(v) || 0) / total * 100) : 0 }));

    return {
      kpis: {
        totalProjects,
        activeProjects,
        totalEstimations,
        totalQuotations,
        acceptedQuotations,
        winRate: totalQuotations ? Math.round(acceptedQuotations / totalQuotations * 100) : 0,
        totalRevenue,
        avgAiConfidence,
        aiAdoptionPct: totalEstimations ? Math.round(aiEstCount / totalEstimations * 100) : 0,
      },
      monthlyRevenue: [],
      costBreakdown: bd,
      recentProjects: recent,
    };
  }

  async getAiAccuracy(tenantId: string) {
    const estimations = await this.estModel.find({ tenantId, aiConfidence: { $ne: null } }).lean();
    if (!estimations.length) {
      return { total_ai_estimates: 0, avg_confidence: 0, high_confidence: 0, medium_confidence: 0, low_confidence: 0, avg_tokens_per_estimate: 0 };
    }

    let high = 0, med = 0, low = 0, sumConf = 0, sumTokens = 0;
    estimations.forEach(e => {
      const conf = Number(e.aiConfidence || 0);
      sumConf += conf;
      sumTokens += (Number(e.aiPromptTokens || 0) + Number(e.aiOutputTokens || 0));
      if (conf >= 80) high++;
      else if (conf >= 60) med++;
      else low++;
    });

    return {
      total_ai_estimates: estimations.length,
      avg_confidence: Math.round(sumConf / estimations.length),
      high_confidence: high,
      medium_confidence: med,
      low_confidence: low,
      avg_tokens_per_estimate: Math.round(sumTokens / estimations.length),
    };
  }

  async getProjectAnalytics(projectId: string, tenantId: string) {
    const estimations = await this.estModel.find({ projectId, tenantId }).sort({ versionNumber: 1 }).lean();
    return { estimations, versionTrend: estimations.map(e => ({ version: e.versionNumber, total: Number(e.finalTotal), date: e.createdAt, status: e.status })) };
  }
}

