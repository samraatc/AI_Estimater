import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type PricingItemDocument = PricingItem & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'pricing_items' })
export class PricingItem {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop({ required: true, index: true }) category: string;
  @Prop() code: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) unit: string;
  @Prop({ required: true, default: 0 }) unitRate: number;
  @Prop({ default: 'USD' }) currency: string;
  @Prop() description: string;
  @Prop({ default: true }) isActive: boolean;
  @Prop({ type: Date }) validFrom: Date;
  @Prop({ type: Date }) validUntil: Date;
  @Prop() source: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  @Prop() createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PricingItemSchema = SchemaFactory.createForClass(PricingItem);

