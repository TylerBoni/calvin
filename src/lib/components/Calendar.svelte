<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { supabase } from '../supabase';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Switch } from '$lib/components/ui/switch';
  import { Input } from '$lib/components/ui/input';
  
  const dispatch = createEventDispatcher();
  
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
  let showWeekends = $state(true); // Toggle for showing/hiding weekends
  let deletingEventId = $state<string | null>(null); // Track which event is being deleted

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
      
      // Skip weekends if showWeekends is false
      if (!showWeekends && (prevDate.getDay() === 0 || prevDate.getDay() === 6)) {
        continue;
      }
      
      const isToday = prevDate.toDateString() === new Date().toDateString();
      const isSelected = prevDate.toDateString() === selectedDate.toDateString();
      
      // Find events for this day - including multi-day events
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const dayStart = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
        const dayEnd = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate(), 23, 59, 59);
        
        // Event overlaps with this day if:
        // Event starts before or on this day AND event ends on or after this day
        return eventStart <= dayEnd && eventEnd >= dayStart;
      });
      
      days.push({
        date: prevDate,
        day: prevDate.getDate(),
        isCurrentMonth: false,
        isToday,
        isSelected,
        events: dayEvents
      });
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      
      // Skip weekends if showWeekends is false
      if (!showWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
        continue;
      }
      
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
    
    // Add empty cells for days after month ends
    const lastDayOfWeek = lastDay.getDay();
    for (let i = lastDayOfWeek + 1; i < 7; i++) {
      const nextDate = new Date(year, month + 1, i - lastDayOfWeek);
      
      // Skip weekends if showWeekends is false
      if (!showWeekends && (nextDate.getDay() === 0 || nextDate.getDay() === 6)) {
        continue;
      }
      
      const isToday = nextDate.toDateString() === new Date().toDateString();
      const isSelected = nextDate.toDateString() === selectedDate.toDateString();
      
      // Find events for this day - including multi-day events
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const dayStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
        const dayEnd = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate(), 23, 59, 59);
        
        // Event overlaps with this day if:
        // Event starts before or on this day AND event ends on or after this day
        return eventStart <= dayEnd && eventEnd >= dayStart;
      });
      
      days.push({
        date: nextDate,
        day: nextDate.getDate(),
        isCurrentMonth: false,
        isToday,
        isSelected,
        events: dayEvents
      });
    }
    
    return days;
  }

  // Week day labels
  const weekDays = showWeekends 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  async function loadEvents() {
    loading = true;
    try {
      // Get events for an extended range to handle multi-day events
      const extendedStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const extendedEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
      
      // Set time to cover the full extended range
      const viewStart = new Date(extendedStart.getFullYear(), extendedStart.getMonth(), extendedStart.getDate());
      const viewEnd = new Date(extendedEnd.getFullYear(), extendedEnd.getMonth(), extendedEnd.getDate(), 23, 59, 59);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .or(`start_time.lte.${viewEnd.toISOString()},end_time.gte.${viewStart.toISOString()}`);

      if (error) throw error;
      events = data || [];
      console.log('Calendar loaded events:', events.length, events);
      console.log('Sample event structure:', events[0]);
      console.log('Extended view period:', viewStart.toISOString(), 'to', viewEnd.toISOString());
      
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
      return 'destructive';
    }
    return 'default';
  }

  function getEventDisplayInfo(event: Event, currentDay: Date) {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const isMultiDay = start.toDateString() !== end.toDateString();
    
    if (isMultiDay) {
      // For multi-day events, show different info based on the day
      const currentDayStart = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
      const currentDayEnd = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 23, 59, 59);
      
      if (start <= currentDayStart && end >= currentDayEnd) {
        // Event spans the entire day
        return { title: event.title, isStart: false, isEnd: false };
      } else if (start <= currentDayStart && end < currentDayEnd) {
        // Event ends on this day
        return { title: event.title, isStart: false, isEnd: true };
      } else if (start > currentDayStart && end >= currentDayEnd) {
        // Event starts on this day
        return { title: event.title, isStart: true, isEnd: false };
      } else {
        // Event is contained within this day
        return { title: event.title, isStart: true, isEnd: true };
      }
    }
    
    // Single day event
    return { title: event.title, isStart: true, isEnd: true };
  }

  function openEventCreator() {
    // Dispatch event to change view to create
    dispatch('viewChange', { view: 'create' });
  }

  function openEventEditor(event: Event) {
    // Dispatch event to change view to edit with event data
    dispatch('viewChange', { view: 'edit', event });
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    deletingEventId = eventId;
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id); // Ensure user can only delete their own events

      if (error) throw error;
      
      // Remove event from local state
      events = events.filter(e => e.id !== eventId);
      console.log('Event deleted successfully');
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    } finally {
      deletingEventId = null;
    }
  }

  function handleEventCreated() {
    // Reload events when a new event is created
    loadEvents();
  }

  onMount(() => {
    loadEvents();
  });
</script>

<div class="space-y-6 px-2 pt-6">
  <!-- Month Navigation and Add Button -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" onclick={previousMonth} class="h-8 w-8">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </Button>
      <span class="text-lg font-medium text-foreground">{formatMonth(currentDate)}</span>
      <Button variant="ghost" size="icon" onclick={nextMonth} class="h-8 w-8">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </Button>
    </div>
        
    <!-- Add Event Button -->
    <Button variant="outline" size="icon" onclick={openEventCreator} class="h-8 w-8">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
    </Button>

  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Calendar Grid -->
    <div class="lg:col-span-2">
      <Card>
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">Weekends</span>
              <Switch
                id="show-weekends"
                checked={showWeekends}
                onCheckedChange={() => showWeekends = !showWeekends}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-2">
          {#if loading}
            <div class="flex items-center justify-center h-64">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          {:else}
            <!-- Week headers -->
            <div class="grid mb-1 {showWeekends ? 'grid-cols-7' : 'grid-cols-5'}">
              {#each weekDays as day, index}
                <div class="p-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {day}
                </div>
              {/each}
            </div>
            
            <!-- Calendar days -->
            <div class="grid gap-0.5 {showWeekends ? 'grid-cols-7' : 'grid-cols-5'}">
              {#each getCalendarDays() as day, index}
                <Button
                  variant="ghost"
                  class="h-12 flex flex-col items-start justify-start p-1 rounded-none
                         {day.isCurrentMonth ? '' : 'text-muted-foreground'}
                         {day.isSelected ? 'bg-accent text-accent-foreground' : ''}
                         {day.isToday ? 'bg-primary/20 text-primary ring-1 ring-primary' : ''}
                         hover:bg-accent/50"
                  onclick={() => selectDate(day)}
                >
                  <span class="text-xs font-medium leading-none">
                    {day.day}
                  </span>
                  
                  <!-- Event indicators -->
                  <div class="flex-1 w-full space-y-0.5 mt-0.5">
                    {#each day.events.slice(0, 3).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()) as event, eventIndex}
                      {@const eventInfo = getEventDisplayInfo(event, day.date)}
                      <div class="flex items-center gap-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span class="text-xs truncate text-muted-foreground">
                          {eventInfo.title}
                        </span>
                      </div>
                    {/each}
                    
                    {#if day.events.length > 3}
                      <div class="text-xs text-muted-foreground">
                        +{day.events.length - 3} more
                      </div>
                    {/if}
                  </div>
                </Button>
              {/each}
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>

    <!-- Selected Day Events -->
    <div>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-base">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 p-3">
          {#if selectedDate}
            {@const dayEvents = events.filter(event => {
              const eventStart = new Date(event.start_time);
              const eventEnd = new Date(event.end_time);
              const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
              const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
              
              return eventStart <= dayEnd && eventEnd >= dayStart;
            }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())}
            
            {#if dayEvents.length === 0}
              <p class="text-muted-foreground text-xs">
                No events scheduled
              </p>
            {:else}
              {#each dayEvents as event}
                <Card class="border-l-4 border-l-primary">
                  <CardContent class="p-2">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-sm">
                          {event.title}
                        </h4>
                        <p class="text-xs text-muted-foreground mt-0.5">
                          {formatEventTime(event)}
                        </p>
                        {#if event.location}
                          <p class="text-xs text-muted-foreground mt-0.5">
                            📍 {event.location}
                          </p>
                        {/if}
                        {#if event.confidence && event.confidence < 70}
                          <Badge variant="destructive" class="mt-1 text-xs">
                            ⚠️ Low confidence
                          </Badge>
                        {/if}
                      </div>
                      
                      <!-- Action buttons -->
                      <div class="flex items-center gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          class="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onclick={() => openEventEditor(event)}
                          title="Edit event"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          class="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onclick={() => deleteEvent(event.id)}
                          disabled={deletingEventId === event.id}
                          title="Delete event"
                        >
                          {#if deletingEventId === event.id}
                            <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          {:else}
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          {/if}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              {/each}
            {/if}
          {/if}
        </CardContent>
      </Card>
    </div>
  </div>
</div> 