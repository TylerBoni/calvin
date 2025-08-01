#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Row Level Security Setup for Supabase\n');

  // Check for required environment variables
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease ensure these variables are set in your .env file or environment.');
    process.exit(1);
  }

  console.log('✅ Environment variables found\n');

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'drizzle', '0001_enable_rls.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('📋 RLS Setup Instructions:\n');
  console.log('Since your Supabase instance doesn\'t have the required RPC functions,');
  console.log('you need to run the RLS setup manually in your Supabase dashboard.\n');
  
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to the SQL Editor');
  console.log('3. Copy and paste the following SQL:\n');
  console.log('─'.repeat(80));
  console.log(migrationContent);
  console.log('─'.repeat(80));
  console.log('\n4. Click "Run" to execute the SQL');
  console.log('5. Verify that RLS is enabled by checking the table settings\n');

  console.log('🔍 To verify RLS is working:');
  console.log('1. Try to query a table without authentication (should fail)');
  console.log('2. Sign in as a user and try to access their own data (should work)');
  console.log('3. Try to access another user\'s data (should fail)\n');

  console.log('📝 Important Notes:');
  console.log('- RLS policies use auth.uid() which requires user authentication');
  console.log('- Service role operations bypass RLS automatically');
  console.log('- Test thoroughly in development before deploying to production');
  console.log('- Monitor your application logs for RLS-related errors\n');

  console.log('✅ Setup instructions provided!');
  console.log('Run the SQL in your Supabase dashboard to enable RLS.');
}

main().catch(console.error); 