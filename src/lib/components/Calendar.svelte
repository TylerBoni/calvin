<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../supabase';
  
  type Event = {
    id: string;
    title: string;
    start_time: string;  // Database uses snake_case
    end_time: string;    // Database uses snake_case
    is_all_day?: boolean;
    location?: string;
    confidence?: number;
    user_id: string;
    created_at?: string;
  };

  type CalendarDay = {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    events: Event[];
  };
  
  let { user } = $props<{
    user: any;
  }>();

  let currentDate = $state(new Date());
  let selectedDate = $state(new Date());
  let events = $state<Event[]>([]);
  let loading = $state(false);
  let viewMode = $state('month'); // 'month', 'week', 'day'

  // Calendar state - compute calendar days
  function getCalendarDays(): CalendarDay[] {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and how many days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Create calendar grid
    const days: CalendarDay[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevDate,
        day: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        events: []
      });
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      
      // Find events for this day - including multi-day events
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        
        // Event overlaps with this day if:
        // Event starts before or on this day AND event ends on or after this day
        return eventStart <= dayEnd && eventEnd >= dayStart;
      });
      
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday,
        isSelected,
        events: dayEvents
      });
    }
    
    // Add days from next month to fill grid
    const remainingCells = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        events: []
      });
    }
    
    return days;
  }

  onMount(() => {
    loadEvents();
  });

  // Reactive statement to reload events when currentDate changes
  $effect(() => {
    loadEvents();
  });

  async function loadEvents() {
    loading = true;
    try {
      // Load events for a wider range to ensure we get all events
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString());

      if (error) throw error;
      events = data || [];
      console.log('Calendar loaded events:', events.length, events);
      console.log('Sample event structure:', events[0]);
      
      // Debug: log the computed calendar days
      if (events.length > 0) {
        const calendarDays = getCalendarDays();
        const daysWithEvents = calendarDays.filter(day => day.events.length > 0);
        console.log('Days with events:', daysWithEvents.length, daysWithEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      loading = false;
    }
  }

  function previousMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  function selectDate(day: CalendarDay) {
    selectedDate = day.date;
  }

  function goToToday() {
    const today = new Date();
    currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = today;
  }

  function formatMonth(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function formatEventTime(event: Event) {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    if (event.is_all_day) {
      return 'All day';
    }
    
    // Check if it's a multi-day event
    const startDate = start.toDateString();
    const endDate = end.toDateString();
    
    if (startDate !== endDate) {
      // Multi-day event
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} day${days > 1 ? 's' : ''} • ${start.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })} - ${end.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}`;
    }
    
    // Same day event
    return `${start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  }

  function getEventColor(event: Event) {
    // Color based on event confidence or type
    if (event.confidence && event.confidence < 70) {
      return 'bg-warning-100 text-warning-700 border-warning-200';
    }
    return 'bg-primary-100 text-primary-700 border-primary-200';
  }

  function getEventDisplayInfo(event: Event, currentDay: Date) {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const isMultiDay = start.toDateString() !== end.toDateString();
    
    let title = event.title;
    let prefix = '';
    
    if (isMultiDay) {
      const currentDayStr = currentDay.toDateString();
      const startDayStr = start.toDateString();
      const endDayStr = end.toDateString();
      
      if (currentDayStr === startDayStr) {
        prefix = '▶ '; // Start of event
      } else if (currentDayStr === endDayStr) {
        prefix = '◀ '; // End of event
      } else {
        prefix = '― '; // Middle of event
      }
    }
    
    return { title: prefix + title, isMultiDay };
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
</script>

<div class="max-w-6xl mx-auto">
  <!-- Calendar Header -->
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-3xl font-bold text-slate-900 dark:text-white">
        {formatMonth(currentDate)}
      </h2>
      <p class="text-slate-600 dark:text-slate-400 mt-1">
        {events.length} events scheduled
      </p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button
        onclick={goToToday}
        class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        Today
      </button>
      
      <div class="flex items-center space-x-1">
        <button
          onclick={previousMonth}
          class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        
        <button
          onclick={nextMonth}
          class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
    <!-- Calendar Grid -->
    <div class="lg:col-span-3 order-2 lg:order-1">
      <div class="glass rounded-2xl p-3 sm:p-6 border border-white/20">
        {#if loading}
          <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        {:else}
          <!-- Week headers -->
          <div class="grid grid-cols-7 gap-px mb-2">
            {#each weekDays as day}
              <div class="p-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {day}
              </div>
            {/each}
          </div>
          
          <!-- Calendar days -->
          <div class="grid grid-cols-7 gap-1">
            {#each getCalendarDays() as day}
              <button
                onclick={() => selectDate(day)}
                class="aspect-square min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 flex flex-col
                       {day.isCurrentMonth 
                         ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700' 
                         : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600'}
                       {day.isSelected ? 'ring-1 sm:ring-2 ring-primary-500' : ''}
                       {day.isToday ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                       transition-colors cursor-pointer rounded-md sm:rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <span class="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 
                           {day.isToday ? 'text-primary-600 dark:text-primary-400' : ''}
                           {day.isSelected ? 'text-primary-700 dark:text-primary-300' : ''}">
                  {day.day}
                </span>
                
                <!-- Event indicators -->
                <div class="flex-1 space-y-0.5 sm:space-y-1 overflow-hidden">
                  {#each day.events.slice(0, 3) as event, index}
                    {@const eventInfo = getEventDisplayInfo(event, day.date)}
                    <div class="text-[10px] sm:text-xs px-0.5 sm:px-1 py-0.5 rounded {getEventColor(event)} truncate leading-tight
                               {index >= 1 ? 'hidden sm:block' : ''}">
                      <span class="hidden sm:inline">{eventInfo.title}</span>
                      <span class="sm:hidden">{eventInfo.title.length > 6 ? eventInfo.title.substring(0, 6) + '…' : eventInfo.title}</span>
                    </div>
                  {/each}
                  
                  {#if day.events.length > 1}
                    <div class="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span class="sm:hidden">+{day.events.length - 1}</span>
                      <span class="hidden sm:inline">+{day.events.length - 3} more</span>
                    </div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Selected Day Events -->
    <div class="lg:col-span-1 order-1 lg:order-2">
      <div class="glass rounded-2xl p-4 sm:p-6 border border-white/20">
        <h3 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </h3>
        
        {#if selectedDate}
          {@const dayEvents = events.filter(event => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
            
            // Event overlaps with selected day
            return eventStart <= dayEnd && eventEnd >= dayStart;
          })}
          
          {#if dayEvents.length === 0}
            <p class="text-slate-500 dark:text-slate-400 text-sm">
              No events scheduled
            </p>
          {:else}
            <div class="space-y-3">
              {#each dayEvents as event}
                <div class="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-white/20">
                  <h4 class="font-medium text-slate-900 dark:text-white text-sm">
                    {event.title}
                  </h4>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatEventTime(event)}
                  </p>
                  {#if event.location}
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      📍 {event.location}
                    </p>
                  {/if}
                  {#if event.confidence && event.confidence < 70}
                    <p class="text-xs text-warning-600 dark:text-warning-400 mt-1">
                      ⚠️ Low confidence
                    </p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
        
        <!-- Quick add button -->
        <button class="w-full mt-4 p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm">
          + Add event for this day
        </button>
      </div>
    </div>
  </div>
</div> 