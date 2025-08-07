<!-- AuthModal.svelte -->
<script lang="ts">
  import { signIn, signUp } from '../supabase';
  
  let { onClose, onSuccess } = $props();
  let isSignUp = $state(false);
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let showEmailConfirmation = $state(false);
  let confirmationEmail = $state('');

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    loading = true;

    try {
      if (isSignUp) {
        // Handle signup with email confirmation
        const { data, error: signUpError } = await signUp(email, password);
        
        if (signUpError) throw signUpError;
        
        if (data.user && !data.user.email_confirmed_at) {
          // Email confirmation required
          showEmailConfirmation = true;
          confirmationEmail = email;
          email = '';
          password = '';
        } else if (data.user) {
          // Email already confirmed (rare case)
          onSuccess(data.user);
        }
      } else {
        // Handle signin
        const authFn = signIn;
        
        // Add timeout protection
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Authentication timeout')), 15000); // 15 second timeout
        });
        
        const authPromise = authFn(email, password);
        
        const result = await Promise.race([authPromise, timeoutPromise]);
        
        if (result.user) {
          onSuccess(result.user);
        }
      }
    } catch (e: any) {
      if (e.message === 'Authentication timeout') {
        error = 'Authentication is taking longer than expected. Please try again.';
      } else {
        error = e.message || 'An error occurred during authentication';
      }
    } finally {
      loading = false;
    }
  }

  function handleBackToSignIn() {
    showEmailConfirmation = false;
    isSignUp = false;
    email = '';
    password = '';
    error = '';
  }
</script>

<div class="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
  <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
    {#if showEmailConfirmation}
      <!-- Email Confirmation Screen -->
      <div class="text-center">
        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Check Your Email
        </h2>
        
        <p class="text-slate-600 dark:text-slate-300 mb-6">
          We've sent a confirmation link to <span class="font-medium text-slate-900 dark:text-white">{confirmationEmail}</span>
        </p>
        
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            Please check your email and click the confirmation link to verify your account. 
            You can then sign in with your credentials.
          </p>
        </div>
        
        <div class="space-y-3">
          <button
            onclick={handleBackToSignIn}
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Sign In
          </button>
          
          <button
            onclick={onClose}
            class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    {:else}
      <!-- Sign In/Sign Up Form -->
      <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" for="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            bind:value={email}
            class="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" for="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            bind:value={password}
            class="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            required
          />
        </div>

        {#if error}
          <p class="text-red-500 text-sm">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        <p class="text-center text-sm text-slate-600 dark:text-slate-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onclick={() => (isSignUp = !isSignUp)}
            class="text-blue-600 hover:text-blue-700 font-medium ml-1"
          >
            {isSignUp ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </form>
    {/if}

    <button
      onclick={onClose}
      class="absolute top-4 right-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</div> 