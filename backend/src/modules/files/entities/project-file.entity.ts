import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ProjectFileDocument = ProjectFile & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'project_files' })
export class ProjectFile {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) projectId: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop() uploadedBy: string;
  @Prop({ required: true }) originalName: string;
  @Prop({ required: true, unique: true, index: true }) storageKey: string;
  @Prop() mimeType: string;
  @Prop({ type: Number }) sizeBytes: number;
  @Prop() fileType: string;
  @Prop({ default: 'pending' }) ocrStatus: string;
  @Prop() ocrText: string;
  @Prop({ default: 'pending' }) parseStatus: string;
  @Prop({ type: Object }) parsedData: any;
  @Prop({ default: false }) embedded: boolean;
  @Prop({ type: Date }) embeddedAt: Date;
  @Prop({ default: 0 }) chunkCount: number;
  @Prop({ default: 1 }) version: number;
  @Prop() parentFileId: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  createdAt: Date;
}

export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);

