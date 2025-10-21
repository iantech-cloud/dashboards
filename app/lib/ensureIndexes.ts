// app/lib/ensureIndexes.ts
import { connectToDatabase } from './mongoose';

export async function ensureMpesaIndexes() {
  await connectToDatabase();
  
  // These indexes will be created automatically by Mongoose,
  // but you can add any additional compound indexes here
  
  console.log('M-Pesa database indexes ensured');
}
