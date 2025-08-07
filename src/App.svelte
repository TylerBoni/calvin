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
    } else if (path === '/auth/callback') {
      // Handle auth callback for email confirmation
      handleAuthCallback();
    } else {
      // Handle unknown routes - redirect to calendar
      navigateTo('/calendar', true);
    }
  }

  // Handle auth callback for email confirmation
  async function handleAuthCallback() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (data.session?.user) {
        // User is now authenticated, sync to local database
        await ensureUserInLocalDB(data.session.user);
        
        // Update authentication state
        isAuthenticated = true;
        user = data.session.user;
        
        // Redirect to calendar
        navigateTo('/calendar', true);
      } else {
        // No session found, redirect to home
        navigateTo('/', true);
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      // Redirect to home on error
      navigateTo('/', true);
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

<div class="h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col overflow-hidden min-h-0">
  <!-- Main Content -->
  <main class="flex-1 max-w-7xl mx-auto w-full flex flex-col overflow-hidden h-full">
    {#if !isAuthenticated}
      <!-- Landing page for unauthenticated users -->
      <div class="flex flex-col min-h-full">
        <!-- Header Section with proper padding -->
        <header class="pt-safe-top p-6 px-4 sm:px-6 lg:px-8">
          <div class="max-w-4xl mx-auto">
            <!-- Logo/Brand Section -->
            <div class="flex items-center justify-center">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  Calvin
                </h1>
              </div>
            </div>
          </div>
        </header>

        <!-- Hero Section -->
        <section class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-safe-bottom">
          <div class="text-center max-w-4xl mx-auto">
            <div class="mb-8 sm:mb-12">
              <h2 class="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6 leading-tight">
                Schedule with
                <span class="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  Natural Language
                </span>
              </h2>
              <p class="text-lg sm:text-xl lg:text-2xl text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
                Just say "Meeting with John tomorrow at 2pm" and let our AI handle the rest. 
                No more clicking through calendars.
              </p>
              
              <!-- CTA Buttons -->
              <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                  onclick={handleLogin}
                  class="px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold text-lg sm:text-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Get Started Free
                </button>
              </div>
            </div>

            <!-- Feature showcase -->
            <div class="grid md:grid-cols-3 gap-6 sm:gap-8 mt-16 sm:mt-20 lg:mt-24">
              <div class="p-6 sm:p-8 glass rounded-2xl hover:scale-105 transition-transform duration-300">
                <div class="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                  <svg class="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                </div>
                <h3 class="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-3">AI-Powered</h3>
                <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">Advanced natural language processing understands your intent perfectly.</p>
              </div>

              <div class="p-6 sm:p-8 glass rounded-2xl hover:scale-105 transition-transform duration-300">
                <div class="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                  <svg class="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h3 class="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-3">Lightning Fast</h3>
                <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">Schedule events in seconds with natural conversation.</p>
              </div>

              <div class="p-6 sm:p-8 glass rounded-2xl hover:scale-105 transition-transform duration-300">
                <div class="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 sm:mb-6 mx-auto">
                  <svg class="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                </div>
                <h3 class="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-3">Smart Scheduling</h3>
                <p class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">Automatically finds the best times and avoids conflicts.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    {:else}
      <!-- Authenticated user interface -->
      {#if currentView === 'calendar'}
        {#key calendarKey}
          <Calendar {user} on:logout={handleLogout} />
        {/key}
      {/if}
    {/if}
  </main>

  <!-- Auth Modal -->
  {#if showAuthModal}
    <AuthModal onClose={closeAuthModal} onSuccess={handleAuthSuccess} />
  {/if}
</div>
