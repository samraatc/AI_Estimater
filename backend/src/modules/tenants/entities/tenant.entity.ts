import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'tenants' })
export class Tenant {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true, index: true }) slug: string;
  @Prop({ default: 'starter' }) plan: string;
  @Prop({ default: 'active' }) status: string;
  @Prop({ required: true, unique: true }) schemaName: string;
  @Prop({ required: true, unique: true }) storageBucket: string;
  @Prop({ default: 10 }) maxUsers: number;
  @Prop({ default: 50 }) maxStorageGb: number;
  @Prop({ default: 'gpt-4o' }) aiModel: string;
  @Prop({ default: 0 }) aiTokensUsed: number;
  @Prop({ default: 5000000 }) aiTokenLimit: number;
  @Prop({ type: Object, default: {} }) settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

