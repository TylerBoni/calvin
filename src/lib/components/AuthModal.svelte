<!-- AuthModal.svelte -->
<script lang="ts">
  import { signIn, signUp } from '../supabase';
  
  let { onClose, onSuccess } = $props();
  let isSignUp = $state(false);
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    loading = true;

    try {
      const authFn = isSignUp ? signUp : signIn;
      
      // Add timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Authentication timeout')), 15000); // 15 second timeout
      });
      
      const authPromise = authFn(email, password);
      
      const result = await Promise.race([authPromise, timeoutPromise]);
      
      if (result.user) {
        onSuccess(result.user);
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
</script>

<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
  <div class="glass rounded-2xl p-8 w-full max-w-md">
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
        class="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
      </button>

      <p class="text-center text-sm text-slate-600 dark:text-slate-400">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        <button
          type="button"
          onclick={() => (isSignUp = !isSignUp)}
          class="text-primary-600 hover:text-primary-700 font-medium ml-1"
        >
          {isSignUp ? 'Sign In' : 'Create Account'}
        </button>
      </p>
    </form>

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