import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { InjectModel }        from '@nestjs/mongoose';
import { Model }               from 'mongoose';
import { OpenAI }             from 'openai';
import { v4 as uuidv4 }        from 'uuid';
import { ProjectFile, ProjectFileDocument } from '../../files/entities/project-file.entity';
import { DocumentEmbedding, DocumentEmbeddingDocument } from '../entities/document-embedding.entity';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;

  constructor(
    private cfg: ConfigService,
    @InjectModel(ProjectFile.name) private fileModel: Model<ProjectFileDocument>,
    @InjectModel(DocumentEmbedding.name) private embeddingModel: Model<DocumentEmbeddingDocument>,
  ) {
    this.openai = new OpenAI({ apiKey: cfg.get('ai.openaiApiKey') });
  }

  async embedAndStore(payload: {
    fileId:    string;
    projectId: string;
    tenantId:  string;
    text:      string;
  }): Promise<number> {
    if (!payload.text?.trim()) {
      this.logger.warn(`No text to embed for file ${payload.fileId}`);
      return 0;
    }

    try {
      // Step 1: chunk the text
      const chunks = this.chunkText(payload.text, 1500, 200);
      if (!chunks.length) return 0;

      this.logger.log(`Generating embeddings for ${chunks.length} chunks`);

      // Step 2: generate embeddings in batches
      const allEmbeddings: { embedding: number[]; chunk: string }[] = [];

      for (let i = 0; i < chunks.length; i += 10) {
        const batch = chunks.slice(i, i + 10).filter(Boolean);
        if (!batch.length) continue;
        const emb = await this.openai.embeddings.create({
          model: this.cfg.get('ai.embeddingModel', 'text-embedding-3-large'),
          input: batch.map(c => c.substring(0, 8000)),
        });
        for (let j = 0; j < emb.data.length; j++) {
          allEmbeddings.push({ embedding: emb.data[j].embedding, chunk: batch[j] });
        }
      }

      // Step 3: Remove any existing embeddings for this file
      await this.embeddingModel.deleteMany({ fileId: payload.fileId }).exec();

      // Step 4: Insert new embeddings into MongoDB
      const docs = allEmbeddings.map((e, idx) => ({
        id:        uuidv4(),
        fileId:    payload.fileId,
        projectId: payload.projectId,
        tenantId:  payload.tenantId,
        chunkIdx:  idx,
        text:      e.chunk,
        vector:    e.embedding,
      }));

      await this.embeddingModel.insertMany(docs);

      // Step 5: update file record
      await this.fileModel.updateOne({ id: payload.fileId }, {
        embedded:   true,
        embeddedAt: new Date(),
        chunkCount: docs.length,
      }).exec();

      this.logger.log(`Stored ${docs.length} vectors in MongoDB for file ${payload.fileId}`);
      return docs.length;

    } catch (err: any) {
      this.logger.error(`Embedding failed for file ${payload.fileId}: ${err.message}`);
      // Don't throw — embedding is optional, estimation can still proceed
      return 0;
    }
  }

  async deleteByFile(fileId: string, tenantId: string): Promise<void> {
    try {
      await this.embeddingModel.deleteMany({ fileId, tenantId }).exec();
    } catch (err: any) {
      this.logger.warn(`Failed to delete embeddings for file ${fileId}: ${err.message}`);
    }
  }

  private chunkText(text: string, size: number, overlap: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const chunks: string[] = [];
    const step = Math.max(1, size - overlap);
    for (let i = 0; i < words.length; i += step) {
      const chunk = words.slice(i, i + size).join(' ');
      if (chunk.trim()) chunks.push(chunk);
    }
    return chunks;
  }
}
