import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  // Cloudinary storage (preferred for free hosting like Vercel / Render)
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey:    process.env.CLOUDINARY_API_KEY    || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryUrl:       process.env.CLOUDINARY_URL        || '',

  // MinIO / S3 storage (fallback or Docker local)
  endpoint:    process.env.MINIO_ENDPOINT   || 'localhost',
  port:        parseInt(process.env.MINIO_PORT, 10) || 9000,
  accessKey:   process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey:   process.env.MINIO_SECRET_KEY || 'changeme',
  useSsl:      process.env.MINIO_USE_SSL === 'true',
  region:      process.env.MINIO_REGION    || 'us-east-1',

  // Email
  emailHost:   process.env.EMAIL_HOST      || '',
  emailPort:   parseInt(process.env.EMAIL_PORT, 10) || 587,
  emailUser:   process.env.EMAIL_USER      || '',
  emailPass:   process.env.EMAIL_PASS      || '',
  emailFrom:   process.env.EMAIL_FROM      || 'noreply@estimateos.com',
  emailSecure: process.env.EMAIL_SECURE === 'true',
}));
