import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ApprovalStepDocument = ApprovalStep & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'approval_steps' })
export class ApprovalStep {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) workflowId: string;
  @Prop({ required: true, index: true }) approverId: string;
  @Prop({ required: true }) stepNumber: number;
  @Prop({ default: 'pending' }) status: string;
  @Prop() comments: string;
  @Prop({ type: Date }) decidedAt: Date;
  createdAt: Date;

  approver?: any;
  workflow?: any;
}

export const ApprovalStepSchema = SchemaFactory.createForClass(ApprovalStep);

