import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import { Queue } from 'bull';
import { ProjectFile, ProjectFileDocument } from './entities/project-file.entity';
import { Project, ProjectDocument } from '../projects/entities/project.entity';
import { StorageService } from '../storage/storage.service';
import { DocumentAgentService } from '../ai/agents/document-agent.service';

const ALLOWED_MIME = new Set(['application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/tiff','text/csv','application/zip','application/x-zip-compressed']);

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectModel(ProjectFile.name) private fileModel:    Model<ProjectFileDocument>,
    @InjectModel(Project.name)     private projectModel: Model<ProjectDocument>,
    @InjectQueue('ai-document-processing') private docQueue: Queue,
    private storage: StorageService,
  ) {}

  async uploadFiles(projectId: string, tenantId: string, userId: string, files: any[]): Promise<ProjectFile[]> {
    const project = await this.projectModel.findOne({ id: projectId, tenantId });
    if (!project) throw new NotFoundException('Project not found');
    const saved: ProjectFile[] = [];
    for (const file of files) {
      const mimeOk = ALLOWED_MIME.has(file.mimetype) || file.mimetype?.startsWith('image/') || file.mimetype?.startsWith('text/');
      if (!mimeOk) throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
      const fileType = DocumentAgentService.detectFileType(file.mimetype, file.originalname);
      const storageKey = this.storage.buildFileKey(tenantId, projectId, file.originalname);
      await this.storage.uploadBuffer(storageKey, file.buffer, file.mimetype);
      const record = await this.fileModel.create({ projectId, tenantId, uploadedBy: userId, originalName: file.originalname, storageKey, mimeType: file.mimetype, sizeBytes: file.size, fileType, ocrStatus: 'pending', parseStatus: 'pending' });
      saved.push(record.toObject());
      await this.docQueue.add('process-file', { fileId: record.id, projectId, tenantId }, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } });
      this.logger.log(`Uploaded: ${file.originalname}`);
    }
    return saved;
  }

  async findByProject(projectId: string, tenantId: string) {
    return this.fileModel.find({ projectId, tenantId }).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string, tenantId: string) {
    const f = await this.fileModel.findOne({ id, tenantId }).lean();
    if (!f) throw new NotFoundException('File not found');
    return f;
  }

  async getDownloadUrl(id: string, tenantId: string): Promise<string> {
    const f = await this.findOne(id, tenantId);
    return this.storage.getPresignedUrl(f.storageKey, 3600);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const f = await this.findOne(id, tenantId);
    await this.storage.deleteFile(f.storageKey);
    await this.fileModel.deleteOne({ id, tenantId });
  }
}

