# Row Level Security (RLS) Setup for Supabase

This document explains how to set up Row Level Security (RLS) for your Supabase database to ensure users can only access their own data.

## What is RLS?

Row Level Security is a PostgreSQL feature that restricts which rows users can access in a table. In Supabase, this is used to ensure that users can only see and modify their own data.

## Setup Options

### Option 1: Run the Setup Script (Recommended)

```bash
# Make the script executable
chmod +x scripts/setup-rls.ts

# Run the setup script
npm run setup-rls
# or
yarn setup-rls
```

### Option 2: Run the Migration Manually

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `drizzle/0001_enable_rls.sql`
4. Execute the SQL

### Option 3: Use the Functions Programmatically

```typescript
import { setupRLS, checkRLSStatus } from './src/lib/db/rls-setup';

// Set up RLS
await setupRLS();

// Check if RLS is enabled
await checkRLSStatus();
```

## What the Setup Does

The RLS setup performs the following actions:

1. **Enables RLS** on all tables:
   - `users`
   - `user_preferences`
   - `events`
   - `ai_conversations`
   - `sessions`

2. **Creates policies** for each table that ensure:
   - Users can only SELECT their own data
   - Users can only UPDATE their own data
   - Users can only INSERT data with their own user_id
   - Users can only DELETE their own data

## Policy Examples

### Users Table
```sql
-- Users can only view their own profile
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);

-- Users can only insert their own profile
CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (auth.uid() = id);
```

### Events Table
```sql
-- Users can only view their own events
CREATE POLICY events_select_own ON events FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own events
CREATE POLICY events_update_own ON events FOR UPDATE USING (auth.uid() = user_id);

-- Users can only insert events for themselves
CREATE POLICY events_insert_own ON events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own events
CREATE POLICY events_delete_own ON events FOR DELETE USING (auth.uid() = user_id);
```

## Testing RLS

After setting up RLS, you can test it by:

1. **Creating a test user** and signing in
2. **Inserting some data** for that user
3. **Trying to access data** from another user's session (should fail)
4. **Verifying that the user can only see their own data**

## Important Notes

1. **Authentication Required**: RLS policies use `auth.uid()` which requires the user to be authenticated
2. **Service Role**: If you need to bypass RLS (for admin operations), use the service role key
3. **Testing**: Always test your RLS policies thoroughly in development before deploying to production

## Troubleshooting

### Common Issues

1. **"No rows returned" errors**: This usually means RLS is blocking access. Check that:
   - The user is authenticated
   - The user_id matches auth.uid()
   - The policy is correctly written

2. **"Permission denied" errors**: This means RLS is working correctly and blocking unauthorized access

3. **Policies not working**: Check that:
   - RLS is enabled on the table
   - The policy syntax is correct
   - The user is properly authenticated

### Debugging

You can check RLS status using:

```typescript
import { checkRLSStatus } from './src/lib/db/rls-setup';
await checkRLSStatus();
```

This will show you which tables have RLS enabled.

## Security Best Practices

1. **Always use RLS** for user data tables
2. **Test thoroughly** before deploying to production
3. **Use service role sparingly** - only for admin operations
4. **Monitor access patterns** to ensure policies are working correctly
5. **Regularly audit** your RLS policies

## Migration Safety

The migration file (`drizzle/0001_enable_rls.sql`) uses `DROP POLICY IF EXISTS` to safely handle cases where policies already exist. This means you can run the migration multiple times without errors. 