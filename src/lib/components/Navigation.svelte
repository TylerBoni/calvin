<script lang="ts">
  let { currentView, onViewChange, user, onLogout } = $props<{
    currentView: string;
    onViewChange: (view: string) => void;
    user: any;
    onLogout: () => void;
  }>();

  let showUserMenu = $state(false);

  const navItems = [
    { id: 'calendar', label: 'Calendar', icon: 'calendar' as const },
    { id: 'create', label: 'Create Event', icon: 'plus' as const },
    { id: 'settings', label: 'Settings', icon: 'settings' as const }
  ];

  function getIcon(iconName: string): string {
    const icons: Record<string, string> = {
      calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      plus: 'M12 4v16m8-8H4',
      settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    };
    return icons[iconName] || icons.calendar;
  }

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
    <button
      onclick={() => handleNavClick(item.id)}
      class="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
             {currentView === item.id 
               ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
               : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700'}"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon(item.icon)}></path>
      </svg>
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
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon('user')}></path>
          </svg>
        </div>
      {/if}
      <span class="hidden sm:inline text-sm font-medium text-slate-900 dark:text-white">
        {user?.name || 'User'}
      </span>
      <svg class="w-4 h-4 text-slate-400 transition-transform {showUserMenu ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
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
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon('settings')}></path>
            </svg>
            Settings
          </button>
          
          <hr class="my-1 border-white/10" />
          
          <button
            onclick={onLogout}
            class="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
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