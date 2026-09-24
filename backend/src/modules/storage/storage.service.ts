import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient?: Minio.Client;
  private useCloudinary = false;

  constructor(private cfg: ConfigService) {
    const cloudName = cfg.get('storage.cloudinaryCloudName');
    const apiKey    = cfg.get('storage.cloudinaryApiKey');
    const apiSecret = cfg.get('storage.cloudinaryApiSecret');
    const cloudUrl  = cfg.get('storage.cloudinaryUrl');

    if (cloudUrl || (cloudName && apiKey && apiSecret)) {
      if (cloudUrl) {
        cloudinary.config({ cloudinary_url: cloudUrl });
      } else {
        cloudinary.config({
          cloud_name: cloudName,
          api_key:    apiKey,
          api_secret: apiSecret,
          secure:     true,
        });
      }
      this.useCloudinary = true;
      this.logger.log('Cloudinary storage enabled');
    } else {
      try {
        const rawEndpoint = cfg.get<string>('storage.endpoint', 'localhost') || 'localhost';
        const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').split(':')[0] || 'localhost';
        const rawPort = cfg.get('storage.port', 9000);
        const cleanPort = typeof rawPort === 'string' ? parseInt(rawPort, 10) : Number(rawPort) || 9000;

        this.minioClient = new Minio.Client({
          endPoint:  cleanEndpoint,
          port:      cleanPort,
          useSSL:    cfg.get('storage.useSsl', false),
          accessKey: cfg.get('storage.accessKey', 'minioadmin'),
          secretKey: cfg.get('storage.secretKey', 'changeme'),
        });
        this.logger.log('MinIO storage enabled (fallback)');
      } catch (err: any) {
        this.logger.warn(`MinIO client initialization skipped: ${err.message}`);
      }
    }
  }

  async onModuleInit() {
    this.logger.log(`Storage service initialized (Provider: ${this.useCloudinary ? 'Cloudinary' : 'MinIO'})`);
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType = 'application/octet-stream', bucket = 'platform-system'): Promise<string> {
    if (this.useCloudinary) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: key.replace(/[^a-zA-Z0-9_-]/g, '_'),
            resource_type: 'auto',
            folder: 'estimateos',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result?.secure_url || key);
          },
        );
        uploadStream.end(buffer);
      });
    }

    if (this.minioClient) {
      await this.ensureBucket(bucket);
      await this.minioClient.putObject(bucket, key, buffer, buffer.length, { 'Content-Type': contentType });
    }
    return key;
  }

  async uploadStream(key: string, stream: Readable, size: number, contentType = 'application/octet-stream', bucket = 'platform-system'): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return this.uploadBuffer(key, buffer, contentType, bucket);
  }

  async downloadFile(key: string, bucket = 'platform-system'): Promise<Buffer> {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      const res = await fetch(key);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (this.useCloudinary) {
      // 1. Try signed private download URL (needed for PDFs and restricted delivery assets)
      try {
        const cleanPublicId = key.startsWith('estimateos/')
          ? key
          : 'estimateos/' + key.replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = key.includes('.') ? key.split('.').pop() || 'pdf' : 'pdf';

        const downloadUrl = (cloudinary.utils as any).private_download_url(cleanPublicId, ext, {
          resource_type: ext === 'pdf' ? 'image' : 'auto',
          type: 'upload',
        });

        const res = await fetch(downloadUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          if (arrayBuffer.byteLength > 0) {
            return Buffer.from(arrayBuffer);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Cloudinary private download attempt failed: ${err.message}`);
      }

      // 2. Fallback to standard delivery URL
      try {
        const url = cloudinary.url(key, { secure: true, resource_type: 'auto' });
        const res = await fetch(url);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err: any) {
        this.logger.warn(`Cloudinary standard download failed: ${err.message}`);
      }

      return Buffer.from('');
    }

    if (!this.minioClient) {
      return Buffer.from('');
    }

    const stream = await this.minioClient.getObject(bucket, key);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      (stream as any).on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      (stream as any).on('error', reject);
      (stream as any).on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async getPresignedUrl(key: string, expiry = 3600, bucket = 'platform-system'): Promise<string> {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    if (this.useCloudinary) {
      try {
        const cleanPublicId = key.startsWith('estimateos/')
          ? key
          : 'estimateos/' + key.replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = key.includes('.') ? key.split('.').pop() || 'pdf' : 'pdf';
        return (cloudinary.utils as any).private_download_url(cleanPublicId, ext, {
          resource_type: ext === 'pdf' ? 'image' : 'auto',
          type: 'upload',
        });
      } catch {
        return cloudinary.url(key, { secure: true, resource_type: 'auto' });
      }
    }
    if (this.minioClient) {
      return this.minioClient.presignedGetObject(bucket, key, expiry);
    }
    return key;
  }

  async deleteFile(key: string, bucket = 'platform-system'): Promise<void> {
    if (this.useCloudinary) {
      try {
        await cloudinary.uploader.destroy(key);
      } catch (err: any) {
        this.logger.warn(`Cloudinary destroy failed: ${err.message}`);
      }
      return;
    }
    if (this.minioClient) {
      await this.minioClient.removeObject(bucket, key);
    }
  }

  async exists(key: string, bucket = 'platform-system'): Promise<boolean> {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return true;
    }
    if (this.useCloudinary) {
      return true;
    }
    if (!this.minioClient) return false;
    try {
      await this.minioClient.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  buildFileKey(tenantId: string, projectId: string, filename: string): string {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `tenants/${tenantId}/projects/${projectId}/files/${Date.now()}_${safe}`;
  }

  buildQuotationKey(tenantId: string, quotationId: string): string {
    return `tenants/${tenantId}/quotations/${quotationId}/quotation.pdf`;
  }

  async ensureBucket(bucket: string): Promise<void> {
    if (!this.minioClient) return;
    try {
      (await this.minioClient.bucketExists(bucket)) || (await this.minioClient.makeBucket(bucket));
    } catch {
      await this.minioClient.makeBucket(bucket);
    }
  }
}
