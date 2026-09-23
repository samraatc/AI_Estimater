import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type QuotationDocument = Quotation & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'quotations' })
export class Quotation {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) estimationId: string;
  @Prop({ required: true, index: true }) projectId: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop() createdBy: string;
  @Prop({ required: true, unique: true, index: true }) quoteNumber: string;
  @Prop({ required: true }) title: string;
  @Prop({ default: 'draft', index: true }) status: string;
  @Prop() scopeSummary: string;
  @Prop() termsConditions: string;
  @Prop({ default: 30 }) validityDays: number;
  @Prop({ type: Date }) validUntil: Date;
  @Prop({ default: 0 }) subtotal: number;
  @Prop({ default: 0 }) taxAmount: number;
  @Prop({ default: 0 }) finalTotal: number;
  @Prop({ default: 'USD' }) currency: string;
  @Prop() pdfStorageKey: string;
  @Prop({ type: Date }) sentAt: Date;
  @Prop() sentToEmail: string;
  @Prop({ type: Date }) signedAt: Date;
  @Prop({ default: true }) aiGenerated: boolean;
  @Prop() templateId: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  estimation?: any;
  project?: any;
}

export const QuotationSchema = SchemaFactory.createForClass(Quotation);

