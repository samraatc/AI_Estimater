import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { InjectModel }        from '@nestjs/mongoose';
import { Model }               from 'mongoose';
import { OpenAI }              from 'openai';
import { ProjectFile, ProjectFileDocument } from '../../files/entities/project-file.entity';
import { DocumentEmbedding, DocumentEmbeddingDocument } from '../entities/document-embedding.entity';
import { RagContext }          from '../interfaces/rag-context.interface';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private openai: OpenAI;

  constructor(
    private cfg: ConfigService,
    @InjectModel(ProjectFile.name) private fileModel: Model<ProjectFileDocument>,
    @InjectModel(DocumentEmbedding.name) private embeddingModel: Model<DocumentEmbeddingDocument>,
  ) {
    this.openai = new OpenAI({ apiKey: cfg.get('ai.openaiApiKey') });
  }

  async retrieveContext(
    projectId: string,
    tenantId:  string,
    _projectType?: string,
  ): Promise<RagContext> {
    try {
      const query = `engineering project estimation materials quantities costs`;
      const queryVec = await this.embed(query);

      // Fetch stored embeddings for this project and tenant from MongoDB
      const storedChunks = await this.embeddingModel
        .find({ projectId, tenantId })
        .select({ text: 1, fileId: 1, chunkIdx: 1, vector: 1 })
        .lean()
        .exec();

      if (!storedChunks || storedChunks.length === 0) {
        return { relevantChunks: [], similarProjects: [], pricingItems: [] };
      }

      // Compute cosine similarity for each chunk
      const scoredChunks = storedChunks
        .map(c => ({
          text:     c.text || '',
          score:    this.cosineSimilarity(queryVec, c.vector),
          fileId:   c.fileId || '',
          chunkIdx: c.chunkIdx || 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      return {
        relevantChunks: scoredChunks,
        similarProjects: [],
        pricingItems: [],
      };
    } catch (err: any) {
      this.logger.warn(`RAG retrieval skipped: ${err.message}`);
      return { relevantChunks: [], similarProjects: [], pricingItems: [] };
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async embed(text: string): Promise<number[]> {
    const r = await this.openai.embeddings.create({
      model: this.cfg.get('ai.embeddingModel', 'text-embedding-3-large'),
      input: text.substring(0, 8000),
    });
    return r.data[0].embedding;
  }

  async deleteByProject(projectId: string, tenantId: string): Promise<void> {
    try {
      await this.embeddingModel.deleteMany({ projectId, tenantId }).exec();
    } catch (err: any) {
      this.logger.warn(`Failed to delete project embeddings: ${err.message}`);
    }
  }
}
