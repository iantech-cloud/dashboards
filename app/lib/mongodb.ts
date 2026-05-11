// app/lib/mongodb.ts
import { MongoClient } from 'mongodb'

// We export a real Promise<MongoClient> so MongoDBAdapter (which does
// `instanceof Promise` / awaits the value directly) works correctly.
//
// The Promise is created lazily — on first import — so that simply
// importing this module during Next.js' build-time "Collecting page data"
// step does NOT throw when MONGODB_URI is missing.  The throw is deferred
// to runtime when the promise actually settles.

let cachedPromise: Promise<MongoClient> | undefined

function getClientPromise(): Promise<MongoClient> {
  if (cachedPromise) return cachedPromise

  if (!process.env.MONGODB_URI) {
    // Return a rejection so callers get a clear error at runtime
    // rather than a cryptic "Configuration" NextAuth error.
    cachedPromise = Promise.reject(
      new Error('Invalid/Missing environment variable: "MONGODB_URI"')
    )
    return cachedPromise
  }

  const uri = process.env.MONGODB_URI

  if (process.env.NODE_ENV === 'development') {
    // Reuse the connection across HMR reloads in dev.
    const g = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }
    if (!g._mongoClientPromise) {
      const client = new MongoClient(uri)
      g._mongoClientPromise = client.connect()
    }
    cachedPromise = g._mongoClientPromise
    return cachedPromise
  }

  // Production: single shared connection per server instance.
  const client = new MongoClient(uri)
  cachedPromise = client.connect()
  return cachedPromise
}

// Export a real Promise created eagerly on first module evaluation.
// This satisfies MongoDBAdapter which expects a genuine Promise<MongoClient>.
const clientPromise: Promise<MongoClient> = getClientPromise()

export default clientPromise
