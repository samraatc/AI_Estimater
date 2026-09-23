import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { EstimationItem } from './estimation-item.entity';

export type EstimationDocument = Estimation & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'estimations' })
export class Estimation {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) projectId: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop() createdBy: string;
  @Prop() lockedBy: string;
  @Prop({ default: 'Estimation v1' }) title: string;
  @Prop({ default: 1 }) versionNumber: number;
  @Prop({ default: 'draft', index: true }) status: string;
  @Prop({ default: 0 }) materialCost: number;
  @Prop({ default: 0 }) steelCost: number;
  @Prop({ default: 0 }) laborCost: number;
  @Prop({ default: 0 }) equipmentCost: number;
  @Prop({ default: 0 }) transportCost: number;
  @Prop({ default: 0 }) overheadCost: number;
  @Prop({ default: 8 }) overheadPct: number;
  @Prop({ default: 0 }) subtotal: number;
  @Prop({ default: 0 }) taxAmount: number;
  @Prop({ default: 5 }) taxPct: number;
  @Prop({ default: 15 }) profitMarginPct: number;
  @Prop({ default: 0 }) profitAmount: number;
  @Prop({ default: 0 }) finalTotal: number;
  @Prop({ default: 'USD' }) currency: string;
  @Prop({ type: Number }) aiConfidence: number;
  @Prop() aiModelUsed: string;
  @Prop({ default: 0 }) aiPromptTokens: number;
  @Prop({ default: 0 }) aiOutputTokens: number;
  @Prop({ type: Object }) aiRawResponse: any;
  @Prop({ type: Array, default: [] }) aiRiskAnalysis: any[];
  @Prop({ type: Array, default: [] }) aiMissingItems: any[];
  @Prop({ type: Array, default: [] }) aiRecommendations: any[];
  @Prop() notes: string;
  @Prop({ default: false }) isLocked: boolean;
  @Prop({ type: Date }) lockedAt: Date;
  @Prop() parentId: string;
  createdAt: Date;
  updatedAt: Date;

  items?: EstimationItem[];
  project?: any;
}

export const EstimationSchema = SchemaFactory.createForClass(Estimation);

