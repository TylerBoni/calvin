<script lang="ts">
  import { onMount } from 'svelte';
  import Calendar from './lib/components/Calendar.svelte';
  import EventCreator from './lib/components/EventCreator.svelte';
  import Navigation from './lib/components/Navigation.svelte';
  import AuthModal from './lib/components/AuthModal.svelte';
  import { supabase, signOut, getSession } from './lib/supabase';
  import type { User } from '@supabase/supabase-js';
  
  // State using Svelte 5 runes
  let currentView = $state('calendar');
  let isAuthenticated = $state(false);
  let showAuthModal = $state(false);
  let user = $state<User | null>(null);
  let calendarKey = $state(0); // Key to force calendar refresh

  // Check authentication status on mount and setup auth listener
  onMount(async () => {
    try {
      // Get initial session
      const session = await getSession();
      isAuthenticated = !!session;
      user = session?.user || null;

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        isAuthenticated = !!session;
        user = session?.user || null;
      });
    } catch (error) {
      console.error('Failed to check authentication:', error);
    }
  });

  function handleViewChange(view: string) {
    currentView = view;
  }

  function handleEventCreated() {
    // Switch back to calendar view and force refresh
    currentView = 'calendar';
    calendarKey += 1; // Force calendar component to re-mount and refresh
  }

  function handleLogin() {
    showAuthModal = true;
  }

  async function handleLogout() {
    try {
      await signOut();
      isAuthenticated = false;
      user = null;
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  function closeAuthModal() {
    showAuthModal = false;
  }

  function handleAuthSuccess(userData: User) {
    isAuthenticated = true;
    user = userData;
    showAuthModal = false;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
  <!-- Header -->
  <header class="glass border-b border-white/20 backdrop-blur-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">AI Calendar</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Smart scheduling assistant</p>
          </div>
        </div>

        <!-- Navigation -->
        {#if isAuthenticated}
          <Navigation 
            {currentView} 
            onViewChange={handleViewChange}
            {user}
            onLogout={handleLogout} 
          />
        {:else}
          <button 
            onclick={handleLogin}
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if !isAuthenticated}
      <!-- Landing page for unauthenticated users -->
      <div class="text-center max-w-4xl mx-auto">
        <div class="mb-12">
          <h2 class="text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Schedule with
            <span class="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Natural Language
            </span>
          </h2>
          <p class="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Just say "Meeting with John tomorrow at 2pm" and let our AI handle the rest. 
            No more clicking through calendars.
          </p>
          <button 
            onclick={handleLogin}
            class="px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started Free
          </button>
        </div>

        <!-- Feature showcase -->
        <div class="grid md:grid-cols-3 gap-8 mt-16">
          <div class="p-6 glass rounded-2xl">
            <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">AI-Powered</h3>
            <p class="text-slate-600 dark:text-slate-300">Advanced natural language processing understands your intent perfectly.</p>
          </div>

          <div class="p-6 glass rounded-2xl">
            <div class="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg class="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Lightning Fast</h3>
            <p class="text-slate-600 dark:text-slate-300">Schedule events in seconds with natural conversation.</p>
          </div>

          <div class="p-6 glass rounded-2xl">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Smart Scheduling</h3>
            <p class="text-slate-600 dark:text-slate-300">Automatically finds the best times and avoids conflicts.</p>
          </div>
        </div>
      </div>
    {:else}
      <!-- Authenticated user interface -->
      {#if currentView === 'calendar'}
        {#key calendarKey}
          <Calendar {user} />
        {/key}
      {:else if currentView === 'create'}
        <EventCreator {user} on:eventCreated={handleEventCreated} />
      {:else if currentView === 'settings'}
        <div class="max-w-2xl mx-auto">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h2>
          <div class="glass rounded-2xl p-6">
            <p class="text-slate-600 dark:text-slate-300">Settings panel coming soon...</p>
          </div>
        </div>
      {/if}
    {/if}
  </main>

  <!-- Auth Modal -->
  {#if showAuthModal}
    <AuthModal onClose={closeAuthModal} onSuccess={handleAuthSuccess} />
  {/if}
</div>
