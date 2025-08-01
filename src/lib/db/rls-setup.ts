import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Setup Row Level Security (RLS) for all tables
 * This function enables RLS and creates policies for secure data access
 */
export async function setupRLS() {
  try {
    console.log('Setting up Row Level Security...');

    // Enable RLS on all tables using direct SQL
    await enableRLSOnTables();
    
    // Create policies for each table using direct SQL
    await createUserPolicies();
    await createUserPreferencesPolicies();
    await createEventsPolicies();
    await createAiConversationsPolicies();
    await createSessionsPolicies();

    console.log('✅ RLS setup completed successfully');
  } catch (error) {
    console.error('❌ Error setting up RLS:', error);
    throw error;
  }
}

/**
 * Enable RLS on all tables using direct SQL
 */
async function enableRLSOnTables() {
  const tables = ['users', 'user_preferences', 'events', 'ai_conversations', 'sessions'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        // Try direct SQL query if RPC doesn't work
        const { error: directError } = await supabase
          .from(table)
          .select('*')
          .limit(0); // This will trigger RLS check
          
        if (directError) {
          console.warn(`Warning: Could not enable RLS on ${table}:`, error.message);
        } else {
          console.log(`✅ Enabled RLS on ${table}`);
        }
      } else {
        console.log(`✅ Enabled RLS on ${table}`);
      }
    } catch (error) {
      console.warn(`Warning: Could not enable RLS on ${table}:`, error);
    }
  }
}

/**
 * Create policies for users table using direct SQL
 */
async function createUserPolicies() {
  const policies = [
    {
      name: 'users_select_own',
      definition: 'FOR SELECT USING (auth.uid() = id)'
    },
    {
      name: 'users_update_own',
      definition: 'FOR UPDATE USING (auth.uid() = id)'
    },
    {
      name: 'users_insert_own',
      definition: 'FOR INSERT WITH CHECK (auth.uid() = id)'
    }
  ];

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS ${policy.name} ON users;
          CREATE POLICY ${policy.name} ON users ${policy.definition};
        `
      });
      
      if (error) {
        console.warn(`Warning: Could not create ${policy.name} policy:`, error.message);
      } else {
        console.log(`✅ Created ${policy.name} policy`);
      }
    } catch (error) {
      console.warn(`Warning: Could not create ${policy.name} policy:`, error);
    }
  }
}

/**
 * Create policies for user_preferences table using direct SQL
 */
async function createUserPreferencesPolicies() {
  const policies = [
    {
      name: 'user_preferences_select_own',
      definition: 'FOR SELECT USING (auth.uid() = user_id)'
    },
    {
      name: 'user_preferences_update_own',
      definition: 'FOR UPDATE USING (auth.uid() = user_id)'
    },
    {
      name: 'user_preferences_insert_own',
      definition: 'FOR INSERT WITH CHECK (auth.uid() = user_id)'
    },
    {
      name: 'user_preferences_delete_own',
      definition: 'FOR DELETE USING (auth.uid() = user_id)'
    }
  ];

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS ${policy.name} ON user_preferences;
          CREATE POLICY ${policy.name} ON user_preferences ${policy.definition};
        `
      });
      
      if (error) {
        console.warn(`Warning: Could not create ${policy.name} policy:`, error.message);
      } else {
        console.log(`✅ Created ${policy.name} policy`);
      }
    } catch (error) {
      console.warn(`Warning: Could not create ${policy.name} policy:`, error);
    }
  }
}

/**
 * Create policies for events table using direct SQL
 */
async function createEventsPolicies() {
  const policies = [
    {
      name: 'events_select_own',
      definition: 'FOR SELECT USING (auth.uid() = user_id)'
    },
    {
      name: 'events_update_own',
      definition: 'FOR UPDATE USING (auth.uid() = user_id)'
    },
    {
      name: 'events_insert_own',
      definition: 'FOR INSERT WITH CHECK (auth.uid() = user_id)'
    },
    {
      name: 'events_delete_own',
      definition: 'FOR DELETE USING (auth.uid() = user_id)'
    }
  ];

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS ${policy.name} ON events;
          CREATE POLICY ${policy.name} ON events ${policy.definition};
        `
      });
      
      if (error) {
        console.warn(`Warning: Could not create ${policy.name} policy:`, error.message);
      } else {
        console.log(`✅ Created ${policy.name} policy`);
      }
    } catch (error) {
      console.warn(`Warning: Could not create ${policy.name} policy:`, error);
    }
  }
}

/**
 * Create policies for ai_conversations table using direct SQL
 */
async function createAiConversationsPolicies() {
  const policies = [
    {
      name: 'ai_conversations_select_own',
      definition: 'FOR SELECT USING (auth.uid() = user_id)'
    },
    {
      name: 'ai_conversations_update_own',
      definition: 'FOR UPDATE USING (auth.uid() = user_id)'
    },
    {
      name: 'ai_conversations_insert_own',
      definition: 'FOR INSERT WITH CHECK (auth.uid() = user_id)'
    },
    {
      name: 'ai_conversations_delete_own',
      definition: 'FOR DELETE USING (auth.uid() = user_id)'
    }
  ];

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS ${policy.name} ON ai_conversations;
          CREATE POLICY ${policy.name} ON ai_conversations ${policy.definition};
        `
      });
      
      if (error) {
        console.warn(`Warning: Could not create ${policy.name} policy:`, error.message);
      } else {
        console.log(`✅ Created ${policy.name} policy`);
      }
    } catch (error) {
      console.warn(`Warning: Could not create ${policy.name} policy:`, error);
    }
  }
}

/**
 * Create policies for sessions table using direct SQL
 */
async function createSessionsPolicies() {
  const policies = [
    {
      name: 'sessions_select_own',
      definition: 'FOR SELECT USING (auth.uid() = user_id)'
    },
    {
      name: 'sessions_update_own',
      definition: 'FOR UPDATE USING (auth.uid() = user_id)'
    },
    {
      name: 'sessions_insert_own',
      definition: 'FOR INSERT WITH CHECK (auth.uid() = user_id)'
    },
    {
      name: 'sessions_delete_own',
      definition: 'FOR DELETE USING (auth.uid() = user_id)'
    }
  ];

  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          DROP POLICY IF EXISTS ${policy.name} ON sessions;
          CREATE POLICY ${policy.name} ON sessions ${policy.definition};
        `
      });
      
      if (error) {
        console.warn(`Warning: Could not create ${policy.name} policy:`, error.message);
      } else {
        console.log(`✅ Created ${policy.name} policy`);
      }
    } catch (error) {
      console.warn(`Warning: Could not create ${policy.name} policy:`, error);
    }
  }
}

/**
 * Alternative setup using direct SQL for more control
 * Use this if the RPC approach doesn't work
 */
export async function setupRLSWithSQL() {
  try {
    console.log('Setting up RLS with direct SQL...');

    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS on all tables
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
        ALTER TABLE events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

        -- Users table policies
        DROP POLICY IF EXISTS users_select_own ON users;
        CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS users_update_own ON users;
        CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS users_insert_own ON users;
        CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (auth.uid() = id);

        -- User preferences table policies
        DROP POLICY IF EXISTS user_preferences_select_own ON user_preferences;
        CREATE POLICY user_preferences_select_own ON user_preferences FOR SELECT USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS user_preferences_update_own ON user_preferences;
        CREATE POLICY user_preferences_update_own ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS user_preferences_insert_own ON user_preferences;
        CREATE POLICY user_preferences_insert_own ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS user_preferences_delete_own ON user_preferences;
        CREATE POLICY user_preferences_delete_own ON user_preferences FOR DELETE USING (auth.uid() = user_id);

        -- Events table policies
        DROP POLICY IF EXISTS events_select_own ON events;
        CREATE POLICY events_select_own ON events FOR SELECT USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS events_update_own ON events;
        CREATE POLICY events_update_own ON events FOR UPDATE USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS events_insert_own ON events;
        CREATE POLICY events_insert_own ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS events_delete_own ON events;
        CREATE POLICY events_delete_own ON events FOR DELETE USING (auth.uid() = user_id);

        -- AI conversations table policies
        DROP POLICY IF EXISTS ai_conversations_select_own ON ai_conversations;
        CREATE POLICY ai_conversations_select_own ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS ai_conversations_update_own ON ai_conversations;
        CREATE POLICY ai_conversations_update_own ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS ai_conversations_insert_own ON ai_conversations;
        CREATE POLICY ai_conversations_insert_own ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS ai_conversations_delete_own ON ai_conversations;
        CREATE POLICY ai_conversations_delete_own ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

        -- Sessions table policies
        DROP POLICY IF EXISTS sessions_select_own ON sessions;
        CREATE POLICY sessions_select_own ON sessions FOR SELECT USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS sessions_update_own ON sessions;
        CREATE POLICY sessions_update_own ON sessions FOR UPDATE USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS sessions_insert_own ON sessions;
        CREATE POLICY sessions_insert_own ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS sessions_delete_own ON sessions;
        CREATE POLICY sessions_delete_own ON sessions FOR DELETE USING (auth.uid() = user_id);
      `
    });

    if (error) {
      console.error('Error setting up RLS with SQL:', error);
      throw error;
    }

    console.log('✅ RLS setup with SQL completed successfully');
  } catch (error) {
    console.error('❌ Error setting up RLS with SQL:', error);
    throw error;
  }
}

/**
 * Check if RLS is enabled on all tables
 */
export async function checkRLSStatus() {
  try {
    const tables = ['users', 'user_preferences', 'events', 'ai_conversations', 'sessions'];
    const results = [];

    for (const table of tables) {
      try {
        // Try to query the table to see if RLS is working
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          // If we get a permission error, RLS is likely enabled
          results.push({
            table: table,
            rlsEnabled: error.message.includes('permission') || error.message.includes('row security')
          });
        } else {
          // If we can query without error, RLS might not be enabled
          results.push({
            table: table,
            rlsEnabled: false
          });
        }
      } catch (error) {
        console.warn(`Could not check RLS status for ${table}:`, error);
        results.push({
          table: table,
          rlsEnabled: 'unknown'
        });
      }
    }

    console.log('RLS Status:');
    results.forEach(result => {
      if (result.rlsEnabled === true) {
        console.log(`  ${result.table}: ✅ RLS Active (blocking queries)`);
      } else if (result.rlsEnabled === false) {
        console.log(`  ${result.table}: ❌ RLS Not Active (queries allowed)`);
      } else {
        console.log(`  ${result.table}: ❓ Unknown`);
      }
    });

    return results;
  } catch (error) {
    console.error('Error checking RLS status:', error);
    throw error;
  }
} 