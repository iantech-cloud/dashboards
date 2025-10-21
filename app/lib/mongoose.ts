// --- MongoDB Connection and Caching Utility (Reads MONGODB_URI) ---
import mongoose from 'mongoose';

// Ensure the MONGODB_URI is available in your environment file
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Updated the error message to reflect that the variable might be in .env or .env.local
  throw new Error(
    'Please define the MONGODB_URI environment variable in your .env or .env.local file'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially during API route
 * usage.
 */
// @ts-ignore
let cached = global.mongoose;

if (!cached) {
  // @ts-ignore
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connects to MongoDB using Mongoose.
 * This function utilizes connection pooling/caching to be efficient in a serverless environment.
 */
export async function connectToDatabase() {
  if (cached.conn) {
    // If connection is already cached, return it
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Re-export Mongoose to allow access to its types and utilities
export { mongoose };

