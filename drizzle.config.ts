import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.VITE_SUPABASE_DB_URL) {
  throw new Error('Missing VITE_SUPABASE_DB_URL environment variable');
}

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.VITE_SUPABASE_DB_URL,
    ssl: true, // Required for Supabase
  },
} satisfies Config; 