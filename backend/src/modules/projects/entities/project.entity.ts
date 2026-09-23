import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'projects' })
export class Project {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop({ index: true }) clientId: string;
  @Prop() createdBy: string;
  @Prop() assignedTo: string;
  @Prop({ required: true, index: true }) name: string;
  @Prop() referenceNumber: string;
  @Prop() description: string;
  @Prop() industry: string;
  @Prop() projectType: string;
  @Prop() location: string;
  @Prop({ default: 'USD' }) currency: string;
  @Prop({ default: 'draft', index: true }) status: string;
  @Prop({ type: Date }) startDate: Date;
  @Prop({ type: Date }) endDate: Date;
  @Prop({ type: Date }) deadline: Date;
  @Prop({ default: 'pending', index: true }) aiStatus: string;
  @Prop({ type: Date }) aiProcessedAt: Date;
  @Prop({ type: Number }) aiConfidence: number;
  @Prop() aiSummary: string;
  @Prop() storagePath: string;
  @Prop({ type: [String], default: [] }) tags: string[];
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  @Prop() clonedFrom: string;
  @Prop({ type: Date, default: null }) deletedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  client?: any;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

