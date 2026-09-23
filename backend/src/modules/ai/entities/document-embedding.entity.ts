import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type DocumentEmbeddingDocument = DocumentEmbedding & Document;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'document_embeddings' })
export class DocumentEmbedding {
  @Prop({ default: uuidv4, index: true })
  id: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true, index: true })
  fileId: string;

  @Prop({ required: true })
  chunkIdx: number;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [Number], required: true })
  vector: number[];

  createdAt: Date;
}

export const DocumentEmbeddingSchema = SchemaFactory.createForClass(DocumentEmbedding);
DocumentEmbeddingSchema.index({ tenantId: 1, projectId: 1 });
DocumentEmbeddingSchema.index({ fileId: 1 });
