// app/lib/mongodb.ts
import { MongoClient } from 'mongodb'

// The default export is a lazy `Promise<MongoClient>`-shaped value: we keep
// the same `import clientPromise from "@/app/lib/mongodb"` ergonomics for
// existing call sites, but we defer reading `MONGODB_URI` and creating the
// connection until the first time the promise is `.then()`-ed / `await`-ed.
//
// This makes simply importing this module side-effect-free, which is critical
// during Next.js' "Collecting page data" build step on Vercel — where route
// modules are loaded but env vars may not yet be available.

const options = {}

let cachedPromise: Promise<MongoClient> | undefined

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
  }

  if (process.env.NODE_ENV === 'development') {
    // In development, reuse the connection across HMR reloads.
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, options)
      globalWithMongo._mongoClientPromise = client.connect()
    }
    return globalWithMongo._mongoClientPromise
  }

  // Production: single shared client per server instance.
  const client = new MongoClient(uri, options)
  return client.connect()
}

function getClientPromise(): Promise<MongoClient> {
  if (!cachedPromise) {
    cachedPromise = createClientPromise()
  }
  return cachedPromise
}

// Thenable proxy: behaves like `Promise<MongoClient>` for any code that does
// `await clientPromise` or `clientPromise.then(...)` without forcing a
// connection at module load time.
const clientPromise = {
  then<TResult1 = MongoClient, TResult2 = never>(
    onfulfilled?: ((value: MongoClient) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return getClientPromise().then(onfulfilled, onrejected)
  },
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<MongoClient | TResult> {
    return getClientPromise().catch(onrejected)
  },
  finally(onfinally?: (() => void) | null): Promise<MongoClient> {
    return getClientPromise().finally(onfinally)
  },
} as unknown as Promise<MongoClient>

export default clientPromise
