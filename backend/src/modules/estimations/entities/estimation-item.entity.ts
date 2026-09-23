import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type EstimationItemDocument = EstimationItem & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'estimation_items' })
export class EstimationItem {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) estimationId: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop() pricingItemId: string;
  @Prop({ default: 0 }) sortOrder: number;
  @Prop({ required: true }) category: string;
  @Prop() code: string;
  @Prop({ required: true }) description: string;
  @Prop() specification: string;
  @Prop({ default: 0 }) quantity: number;
  @Prop({ default: 'unit' }) unit: string;
  @Prop({ default: 0 }) unitRate: number;
  @Prop({ default: 0 }) discountPct: number;
  @Prop({ default: 0 }) totalAmount: number;
  @Prop({ default: 'USD' }) currency: string;
  @Prop({ default: 'ai' }) source: string;
  @Prop({ type: Number }) aiConfidence: number;
  @Prop({ default: false }) isFlagged: boolean;
  @Prop() flagReason: string;
  @Prop() notes: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const EstimationItemSchema = SchemaFactory.createForClass(EstimationItem);

