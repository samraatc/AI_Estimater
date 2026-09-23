import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/estimateos',
  retryAttempts: 10,
  retryDelay: 3000,
}));