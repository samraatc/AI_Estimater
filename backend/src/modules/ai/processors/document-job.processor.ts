import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bull';
import { ProjectFile, ProjectFileDocument } from '../../files/entities/project-file.entity';
import { DocumentAgentService } from '../agents/document-agent.service';
import { EmbeddingService } from '../services/embedding.service';

@Processor('ai-document-processing')
export class DocumentJobProcessor {
  private readonly logger = new Logger(DocumentJobProcessor.name);

  constructor(
    @InjectModel(ProjectFile.name) private fileModel: Model<ProjectFileDocument>,
    private docAgent: DocumentAgentService,
    private embedding: EmbeddingService,
  ) {}

  @Process('process-file')
  async handleProcessFile(job: Job<{ fileId: string; projectId: string; tenantId: string }>) {
    const { fileId, projectId, tenantId } = job.data;
    this.logger.log(`Processing file ${fileId}`);
    const file = await this.fileModel.findOne({ id: fileId }).exec();
    if (!file) return;
    try {
      await this.fileModel.updateOne({ id: fileId }, { ocrStatus: 'processing' }).exec();
      const text = await this.docAgent.extractText(file);
      await this.fileModel.updateOne({ id: fileId }, { ocrText: text, ocrStatus: 'done', parseStatus: 'done' }).exec();
      if (text?.trim()) {
        await this.embedding.embedAndStore({ fileId, projectId, tenantId, text });
      }
      this.logger.log(`File ${fileId} processed`);
    } catch (err: any) {
      this.logger.error(`File ${fileId} failed: ${err.message}`);
      await this.fileModel.updateOne({ id: fileId }, { ocrStatus: 'failed' }).exec();
      throw err;
    }
  }
}
