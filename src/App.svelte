<script lang="ts">
  import { onMount } from 'svelte';
  import Calendar from './lib/components/Calendar.svelte';
  import EventCreator from './lib/components/EventCreator.svelte';
  import AuthModal from './lib/components/AuthModal.svelte';
  import { supabase, signOut, getSession, ensureUserInLocalDB } from './lib/supabase';
  import type { User } from '@supabase/supabase-js';
  import "./app.css";
  
  // State using Svelte 5 runes
  let currentView = $state('calendar');
  let isAuthenticated = $state(false);
  let showAuthModal = $state(false);
  let user = $state<User | null>(null);
  let calendarKey = $state(0); // Key to force calendar refresh
  let editingEvent = $state<any>(null); // Store event data for editing
  let urlParams = $state<URLSearchParams>(new URLSearchParams());

  // Router functions
  function navigateTo(path: string, replace = false) {
    const url = new URL(window.location.href);
    
    // Check if path includes query parameters
    if (path.includes('?')) {
      const [pathname, search] = path.split('?');
      url.pathname = pathname;
      url.search = '?' + search;
    } else {
      url.pathname = path;
      // Clear search params if not provided
      url.search = '';
    }
    
    if (replace) {
      window.history.replaceState({}, '', url.toString());
    } else {
      window.history.pushState({}, '', url.toString());
    }
    
    updateRoute();
  }

  function updateRoute() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    urlParams = params;
    
    // Extract view from path
    if (path === '/' || path === '/calendar') {
      currentView = 'calendar';
    } else if (path === '/create') {
      currentView = 'create';
    } else if (path === '/edit') {
      currentView = 'edit';
      // Extract event data from URL params if available
      const eventData = params.get('event');
      if (eventData) {
        try {
          editingEvent = JSON.parse(decodeURIComponent(eventData));
        } catch (e) {
          console.error('Failed to parse event data from URL:', e);
          editingEvent = null;
        }
      }
    } else if (path === '/settings') {
      currentView = 'settings';
    } else {
      // Handle unknown routes - redirect to calendar
      navigateTo('/calendar', true);
    }
  }

  // Handle browser back/forward buttons
  function handlePopState() {
    updateRoute();
  }

  // Check authentication status on mount and setup auth listener
  onMount(async () => {
    try {
      // Set up routing
      updateRoute();
      window.addEventListener('popstate', handlePopState);
      
      // Get initial session
      const session = await getSession();
      isAuthenticated = !!session;
      user = session?.user || null;
      
      // Sync user to local database if they exist - defer to prevent deadlock
      if (session?.user) {
        setTimeout(async () => {
          try {
            await ensureUserInLocalDB(session.user);
          } catch (error) {
            console.error('Failed to sync user on mount:', error);
          }
        }, 0);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        isAuthenticated = !!session;
        user = session?.user || null;
        
        // Sync user to local database when they sign in - defer to prevent deadlock
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          setTimeout(async () => {
            try {
              await ensureUserInLocalDB(session.user);
            } catch (error) {
              console.error('Failed to sync user on auth change:', error);
            }
          }, 0);
        }
      });
    } catch (error) {
      console.error('Failed to check authentication:', error);
    }
  });

  function handleViewChange(event: CustomEvent<{ view: string; event?: any }>) {
    const { view, event: eventData } = event.detail;
    
    // Store event data if we're switching to edit view
    if (view === 'edit' && eventData) {
      editingEvent = eventData;
      // Navigate to edit route with event data
      const eventParam = encodeURIComponent(JSON.stringify(eventData));
      navigateTo(`/edit?event=${eventParam}`);
    } else {
      editingEvent = null;
      
      // Navigate to appropriate route
      if (view === 'calendar') {
        navigateTo('/calendar');
        // Force calendar refresh when returning to calendar view
        calendarKey += 1;
      } else if (view === 'create') {
        navigateTo('/create');
      } else if (view === 'settings') {
        navigateTo('/settings');
      }
    }
  }

  function handleEventCreated() {
    // Switch back to calendar view and force refresh
    navigateTo('/calendar');
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
      // Redirect to home after logout
      navigateTo('/', true);
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
    // Redirect to calendar after successful login
    navigateTo('/calendar');
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 pt-2 sm:pt-6">
    {#if !isAuthenticated}
      <!-- Landing page for unauthenticated users -->
      <div class="text-center max-w-4xl mx-auto">
        <div class="mb-8 sm:mb-12">
          <h2 class="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">
            Schedule with
            <span class="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Natural Language
            </span>
          </h2>
          <p class="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Just say "Meeting with John tomorrow at 2pm" and let our AI handle the rest. 
            No more clicking through calendars.
          </p>
          <button 
            onclick={handleLogin}
            class="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-xl font-semibold text-base sm:text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started Free
          </button>
        </div>

        <!-- Feature showcase -->
        <div class="grid md:grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 px-4">
          <div class="p-4 sm:p-6 glass rounded-2xl">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">AI-Powered</h3>
            <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300">Advanced natural language processing understands your intent perfectly.</p>
          </div>

          <div class="p-4 sm:p-6 glass rounded-2xl">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-success-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">Lightning Fast</h3>
            <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300">Schedule events in seconds with natural conversation.</p>
          </div>

          <div class="p-4 sm:p-6 glass rounded-2xl">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">Smart Scheduling</h3>
            <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300">Automatically finds the best times and avoids conflicts.</p>
          </div>
        </div>
      </div>
    {:else}
      <!-- Authenticated user interface -->
      {#if currentView === 'calendar'}
        {#key calendarKey}
          <Calendar {user} on:viewChange={handleViewChange} />
        {/key}
      {:else if currentView === 'create'}
        <EventCreator {user} on:eventCreated={handleEventCreated} on:viewChange={handleViewChange} />
      {:else if currentView === 'edit'}
        <EventCreator {user} {editingEvent} on:eventCreated={handleEventCreated} on:viewChange={handleViewChange} />
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
