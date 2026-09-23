import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'users' })
export class User {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop({ required: true, index: true }) roleId: string;
  @Prop({ required: true, index: true }) email: string;
  @Prop({ default: '' }) passwordHash: string;
  @Prop() firstName: string;
  @Prop() lastName: string;
  @Prop() avatarUrl: string;
  @Prop() department: string;
  @Prop({ default: 'active' }) status: string;
  @Prop({ type: Date }) lastLoginAt: Date;
  @Prop({ default: false }) mfaEnabled: boolean;
  @Prop() mfaSecret: string;
  @Prop() inviteToken: string;
  @Prop({ type: Date }) inviteExpires: Date;
  @Prop({ type: Object, default: {} }) settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Virtual for joined relations compatibility
  role?: any;
  tenant?: any;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

