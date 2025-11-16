// lib/db-utils.ts
import { connectToDatabase } from './models';

let connectionPromise: Promise<any> | null = null;

export async function getDatabaseConnection() {
  if (!connectionPromise) {
    connectionPromise = connectToDatabase().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
}

export async function withDatabaseConnection<T>(operation: () => Promise<T>): Promise<T> {
  await getDatabaseConnection();
  return operation();
}
