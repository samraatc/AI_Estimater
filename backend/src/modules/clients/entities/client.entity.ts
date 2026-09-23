import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ClientDocument = Client & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, collection: 'clients' })
export class Client {
  @Prop({ default: uuidv4, index: true }) id: string;
  @Prop({ required: true, index: true }) tenantId: string;
  @Prop({ required: true }) name: string;
  @Prop() company: string;
  @Prop({ index: true }) email: string;
  @Prop() phone: string;
  @Prop() address: string;
  @Prop() country: string;
  @Prop({ default: 'USD' }) currency: string;
  @Prop() taxNumber: string;
  @Prop() notes: string;
  @Prop({ default: 'active' }) status: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, any>;
  @Prop() createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

