import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type RoleDocument = Role & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'roles' })
export class Role {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop({ required: true }) name: string;
  @Prop({ default: false }) isSystem: boolean;
  @Prop({ type: [String], default: [] }) permissions: string[];
  createdAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

