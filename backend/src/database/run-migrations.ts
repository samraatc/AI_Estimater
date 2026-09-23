import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/estimateos';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('MongoDB schema initialization complete (managed dynamically by Mongoose).');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
