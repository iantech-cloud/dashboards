import mongoose, { type Connection } from "mongoose"

interface MongooseCache {
  conn: Connection | null
  promise: Promise<typeof mongoose> | null
}

// MONGODB_URI is read lazily inside connectToDatabase() so that simply importing
// this module (e.g. during Next.js page-data collection at build time) does not
// throw when the env var is not yet injected. The check is enforced on first
// actual connection attempt.

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially during API route
 * usage.
 */
declare global {
  var myMongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.myMongoose || { conn: null, promise: null }

if (!global.myMongoose) {
  global.myMongoose = cached
}

/**
 * Connects to MongoDB using Mongoose.
 * This function utilizes connection pooling/caching to be efficient in a serverless environment.
 *
 * @returns {Promise<Connection>} The cached Mongoose connection
 * @throws {Error} If connection fails or MONGODB_URI is not defined
 */
export async function connectToDatabase(): Promise<Connection> {
  // If connection is already cached, return it
  if (cached.conn) {
    return cached.conn
  }

  // Lazy env-var check: only fail when actually trying to connect.
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable in your .env or .env.local file",
    )
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      socketTimeoutMS: 45000, // Increased socket timeout
      maxPoolSize: 10, // Maximum number of sockets in the connection pool
      minPoolSize: 1, // Minimum number of sockets in the connection pool
      maxIdleTimeMS: 30000, // How long a socket can stay idle before being closed
      connectTimeoutMS: 30000, // How long to wait for initial connection
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
    }

    console.log('🔗 Attempting to connect to MongoDB...');
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('✅ MongoDB connected successfully');
        
        // Set up connection event handlers
        mongooseInstance.connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err);
        });

        mongooseInstance.connection.on('disconnected', () => {
          console.log('⚠️ MongoDB disconnected');
        });

        mongooseInstance.connection.on('reconnected', () => {
          console.log('🔁 MongoDB reconnected');
        });

        return mongooseInstance;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection failed:', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    const mongooseInstance = await cached.promise;
    cached.conn = mongooseInstance.connection;
    
    // Check if connection is ready
    if (cached.conn.readyState !== 1) {
      console.warn('⚠️ MongoDB connection is not ready. State:', cached.conn.readyState);
    }
    
  } catch (e) {
    cached.promise = null;
    console.error('💥 MongoDB connection error:', e);
    throw new Error(`Failed to connect to MongoDB: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  return cached.conn as Connection;
}

// Re-export Mongoose to allow access to its types and utilities
export { mongoose }
export type { Connection, Mongoose } from "mongoose"
