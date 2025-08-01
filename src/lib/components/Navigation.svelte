<script lang="ts">
  import { Calendar, Plus, Settings, User, ChevronDown, LogOut } from 'lucide-svelte';

  let { currentView, onViewChange, user, onLogout } = $props<{
    currentView: string;
    onViewChange: (view: string) => void;
    user: any;
    onLogout: () => void;
  }>();

  let showUserMenu = $state(false);

  const navItems = [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'create', label: 'Create Event', icon: Plus },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  function toggleUserMenu() {
    showUserMenu = !showUserMenu;
  }

  function handleNavClick(viewId: string) {
    onViewChange(viewId);
  }
</script>

<nav class="flex items-center space-x-1">
  <!-- Navigation Items -->
  {#each navItems as item}
  {@const NavIcon = item.icon}
    <button
      onclick={() => handleNavClick(item.id)}
      class="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
             {currentView === item.id 
               ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
               : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700'}"
    >
      <NavIcon class="w-4 h-4" />
      <span class="hidden sm:inline">{item.label}</span>
    </button>
  {/each}

  <!-- User Menu -->
  <div class="relative ml-4">
    <button
      onclick={toggleUserMenu}
      class="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      {#if user?.avatar}
        <img src={user.avatar} alt={user.name} class="w-8 h-8 rounded-full" />
      {:else}
        <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
          <User class="w-4 h-4 text-white" />
        </div>
      {/if}
      <span class="hidden sm:inline text-sm font-medium text-slate-900 dark:text-white">
        {user?.name || 'User'}
      </span>
      <ChevronDown class="w-4 h-4 text-slate-400 transition-transform {showUserMenu ? 'rotate-180' : ''}" />
    </button>

    {#if showUserMenu}
      <div class="absolute right-0 mt-2 w-48 glass rounded-xl shadow-lg border border-white/20 z-50 animate-slide-in">
        <div class="py-2">
          <div class="px-4 py-2 border-b border-white/10">
            <p class="text-sm font-medium text-slate-900 dark:text-white">{user?.name}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          
          <button
            onclick={() => handleNavClick('settings')}
            class="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings class="w-4 h-4 mr-2" />
            Settings
          </button>
          
          <hr class="my-1 border-white/10" />
          
          <button
            onclick={onLogout}
            class="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut class="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    {/if}
  </div>
</nav>

{#if showUserMenu}
  <!-- Click outside to close -->
  <div class="fixed inset-0 z-40" onclick={() => showUserMenu = false}></div>
{/if} 