import { createClient } from '@supabase/supabase-js';
import { getUser, createUser, updateUser } from './database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sync user between Supabase Auth and local database
async function ensureUserInLocalDB(user: any) {
  try {
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database sync timeout')), 10000); // 10 second timeout
    });

    const syncPromise = async () => {
      // First, check if user exists by ID
      const existingUserById = await getUser(user.id);

      if (existingUserById) {
        // User exists with correct ID, we're good
        return;
      }

      // Check if user exists by email (in case of ID mismatch)
      const { data: existingUserByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (existingUserByEmail) {
        // User exists with same email but different ID
        // Update the existing user with the new Supabase Auth ID
        await supabase
          .from('users')
          .update({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            avatar: user.user_metadata?.avatar_url,
            email_verified: user.email_confirmed_at ? true : false,
            provider: user.app_metadata?.provider || 'credentials',
            provider_id: user.user_metadata?.sub || user.id
          })
          .eq('email', user.email);

        console.log('Updated existing user with new Supabase Auth ID');
      } else {
        // No user exists, create new one
        await createUser({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          avatar: user.user_metadata?.avatar_url,
          email_verified: user.email_confirmed_at ? true : false,
          provider: user.app_metadata?.provider || 'credentials',
          provider_id: user.user_metadata?.sub || user.id
        });

        console.log('Created new user in local database');
      }
    };

    // Race the sync operation against the timeout
    await Promise.race([syncPromise(), timeoutPromise]);
  } catch (error: any) {
    console.error('Error syncing user to local database:', error);
    
    // If it's a timeout or network error, don't block authentication
    if (error.message === 'Database sync timeout' || error.code === 'NETWORK_ERROR') {
      console.warn('Database sync failed, but continuing with authentication');
      return;
    }
    
    // If it's a duplicate key error for email, it means another process created the user
    // during our check. Let's try to handle this race condition by attempting an update
    if (error.code === '23505' && error.details?.includes('email')) {
      try {
        await supabase
          .from('users')
          .update({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            avatar: user.user_metadata?.avatar_url,
            email_verified: user.email_confirmed_at ? true : false,
            provider: user.app_metadata?.provider || 'credentials',
            provider_id: user.user_metadata?.sub || user.id
          })
          .eq('email', user.email);
        
        console.log('Handled race condition by updating existing user');
        return;
      } catch (updateError) {
        console.error('Failed to handle race condition:', updateError);
      }
    }
    
    // For other errors, log but don't throw to avoid blocking authentication
    console.warn('Database sync failed, but continuing with authentication:', error);
  }
}

// Auth helper functions
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    // Ensure user exists in local database (with timeout protection)
    if (data.user) {
      try {
        await ensureUserInLocalDB(data.user);
      } catch (syncError) {
        console.warn('User sync failed, but authentication succeeded:', syncError);
        // Don't throw - authentication was successful
      }
    }
    
    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    
    // Ensure user exists in local database (with timeout protection)
    if (data.user) {
      try {
        await ensureUserInLocalDB(data.user);
      } catch (syncError) {
        console.warn('User sync failed, but authentication succeeded:', syncError);
        // Don't throw - authentication was successful
      }
    }
    
    return data;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Export the sync function for use in auth state changes
export { ensureUserInLocalDB }; 