#!/usr/bin/env node

import dotenv from 'dotenv';
import { setupRLS, setupRLSWithSQL, checkRLSStatus } from '../src/lib/db/rls-setup';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Setting up Row Level Security for Supabase...\n');

  // Check for required environment variables
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease ensure these variables are set in your .env file or environment.');
    process.exit(1);
  }

  try {
    // First, try the RPC approach
    console.log('Attempting RPC-based RLS setup...');
    await setupRLS();
  } catch (error) {
    console.log('RPC approach failed, trying SQL-based setup...');
    try {
      await setupRLSWithSQL();
    } catch (sqlError) {
      console.error('❌ Both RPC and SQL approaches failed. Please run the migration manually.');
      console.error('You can run the SQL from drizzle/0001_enable_rls.sql in your Supabase SQL editor.');
      process.exit(1);
    }
  }

  // Check the status after setup
  console.log('\n🔍 Checking RLS status...');
  await checkRLSStatus();

  console.log('\n✅ RLS setup completed!');
  console.log('📝 Note: Make sure your Supabase client is configured with the correct auth context.');
}

main().catch(console.error); 