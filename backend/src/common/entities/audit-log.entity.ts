import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop({ index: true }) userId: string;
  @Prop({ required: true }) action: string;
  @Prop() entityType: string;
  @Prop() entityId: string;
  @Prop({ type: Object }) oldData: any;
  @Prop({ type: Object }) newData: any;
  @Prop() ipAddress: string;
  @Prop() userAgent: string;
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

