import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ApprovalStep } from './approval-step.entity';

export type ApprovalWorkflowDocument = ApprovalWorkflow & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'approval_workflows' })
export class ApprovalWorkflow {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop({ required: true, index: true }) estimationId: string;
  @Prop() submittedBy: string;
  @Prop({ default: 1 }) currentStep: number;
  @Prop({ default: 1 }) totalSteps: number;
  @Prop({ default: 'pending' }) status: string;
  @Prop({ type: Date }) submittedAt: Date;
  @Prop({ type: Date }) completedAt: Date;
  createdAt: Date;

  steps?: ApprovalStep[];
  estimation?: any;
}

export const ApprovalWorkflowSchema = SchemaFactory.createForClass(ApprovalWorkflow);

