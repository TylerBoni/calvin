import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!import.meta.env.VITE_SUPABASE_DB_URL) {
  throw new Error('Missing database connection string');
}

// Create a new Postgres client with SSL enabled
const client = postgres(import.meta.env.VITE_SUPABASE_DB_URL, { 
  ssl: 'require',
  max: 1 // Use a single connection since we're in a serverless environment
});

export const db = drizzle(client, { schema }); 