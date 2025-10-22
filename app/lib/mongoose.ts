import mongoose, { type Connection } from "mongoose"

interface MongooseCache {
  conn: Connection | null
  promise: Promise<typeof mongoose> | null
}

// Ensure the MONGODB_URI is available in your environment file
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in your .env or .env.local file")
}

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

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose buffering
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m
    })
  }

  try {
    const mongooseInstance = await cached.promise
    cached.conn = mongooseInstance.connection
  } catch (e) {
    cached.promise = null
    throw new Error(`Failed to connect to MongoDB: ${e instanceof Error ? e.message : "Unknown error"}`)
  }

  return cached.conn as Connection
}

// Re-export Mongoose to allow access to its types and utilities
export { mongoose }
export type { Connection, Mongoose } from "mongoose"

