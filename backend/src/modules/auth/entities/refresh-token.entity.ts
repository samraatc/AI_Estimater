import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) userId: string;
  @Prop({ required: true, unique: true, index: true }) tokenHash: string;
  @Prop({ required: true, type: Date }) expiresAt: Date;
  @Prop() ipAddress: string;
  @Prop() userAgent: string;
  @Prop({ default: false }) revoked: boolean;
  createdAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

