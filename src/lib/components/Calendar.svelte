<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { supabase } from "../supabase";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";

  import {
    getEventColorClasses,
    getEventColorName,
    type EventColor,
  } from "../utils/colors";
  import EventCreatorDrawer from "./EventCreatorDrawer.svelte";
  import EventCardDrawer from "./EventCardDrawer.svelte";
  import DayViewDrawer from "./DayViewDrawer.svelte";
  
  // Store imports - only what we're currently using
  import { eventStoreActions } from '$lib/stores/eventStore';
  // TODO: Gradually migrate to use more store functionality
  // import { EventService } from '../services/eventService';

  const dispatch = createEventDispatcher();

  type Event = {
    id: string;
    title: string;
    start_time: string; // Database uses snake_case
    end_time: string; // Database uses snake_case
    is_all_day?: boolean;
    location?: string;
    confidence?: number;
    color?: EventColor; // Color coding for events
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
  let showWeekends = $state(true); // Toggle for showing/hiding weekends
  let deletingEventId = $state<string | null>(null); // Track which event is being deleted
  let isMobile = $state(false); // Track if we're on mobile
  let showEventCreatorDrawer = $state(false);
  let showEventCardDrawer = $state(false);
  let showDayViewDrawer = $state(false);
  let selectedEvent = $state<any>(null);
  let editingEvent = $state<any>(null);
  let initialMessage = $state<string>("");
  let contextMessage = $state<any>(null);
  let lastTapTime = $state<number>(0);
  let tapTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let eventInput: HTMLInputElement;

  // Check if we're on mobile
  function checkMobile() {
    isMobile = window.innerWidth < 640; // sm breakpoint
  }

  // Calendar state - compute calendar days for a specific month
  function getCalendarDays(date: Date = currentDate): CalendarDay[] {
    const year = date.getFullYear();
    const month = date.getMonth();

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
      if (
        !showWeekends &&
        (prevDate.getDay() === 0 || prevDate.getDay() === 6)
      ) {
        continue;
      }

      const isToday = prevDate.toDateString() === new Date().toDateString();
      const isSelected =
        prevDate.toDateString() === selectedDate.toDateString();

      // Find events for this day - including multi-day events
      const dayEvents = events.filter((event) => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const dayStart = new Date(
          prevDate.getFullYear(),
          prevDate.getMonth(),
          prevDate.getDate()
        );
        const dayEnd = new Date(
          prevDate.getFullYear(),
          prevDate.getMonth(),
          prevDate.getDate(),
          23,
          59,
          59
        );

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
        events: dayEvents,
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
      const dayEvents = events.filter((event) => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const dayStart = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        const dayEnd = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          23,
          59,
          59
        );

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
        events: dayEvents,
      });
    }

    // Add empty cells for days after month ends
    const lastDayOfWeek = lastDay.getDay();
    for (let i = lastDayOfWeek + 1; i < 7; i++) {
      const nextDate = new Date(year, month + 1, i - lastDayOfWeek);

      // Skip weekends if showWeekends is false
      if (
        !showWeekends &&
        (nextDate.getDay() === 0 || nextDate.getDay() === 6)
      ) {
        continue;
      }

      const isToday = nextDate.toDateString() === new Date().toDateString();
      const isSelected =
        nextDate.toDateString() === selectedDate.toDateString();

      // Find events for this day - including multi-day events
      const dayEvents = events.filter((event) => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        const dayStart = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth(),
          nextDate.getDate()
        );
        const dayEnd = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth(),
          nextDate.getDate(),
          23,
          59,
          59
        );

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
        events: dayEvents,
      });
    }

    return days;
  }

  // Week day labels - reactive to showWeekends changes
  let weekDays = $derived(
    showWeekends
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri"]
  );

  async function loadEvents() {
    loading = true;
    try {
      // Get events for an extended range to handle multi-day events
      const extendedStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );
      const extendedEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 2,
        0
      );

      // Set time to cover the full extended range
      const viewStart = new Date(
        extendedStart.getFullYear(),
        extendedStart.getMonth(),
        extendedStart.getDate()
      );
      const viewEnd = new Date(
        extendedEnd.getFullYear(),
        extendedEnd.getMonth(),
        extendedEnd.getDate(),
        23,
        59,
        59
      );

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Filter events that overlap with the view period
      events = (data || []).filter((event) => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        return eventStart <= viewEnd && eventEnd >= viewStart;
      });
      console.log("Calendar loaded events:", events.length, events);
      console.log("Sample event structure:", events[0]);
      console.log(
        "Extended view period:",
        viewStart.toISOString(),
        "to",
        viewEnd.toISOString()
      );

      // Debug: log the computed calendar days
      if (events.length > 0) {
        const calendarDays = getCalendarDays();
        const daysWithEvents = calendarDays.filter(
          (day) => day.events.length > 0
        );
        console.log("Days with events:", daysWithEvents.length, daysWithEvents);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
      events = []; // Reset events on error
    } finally {
      loading = false;
    }
  }

  function previousMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    loadEvents();
  }

  function nextMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );
    loadEvents();
  }

  function selectDate(day: CalendarDay) {
    selectedDate = day.date;

    // On mobile, open the day view drawer
    if (isMobile) {
      showDayViewDrawer = true;
    }
  }

  function formatMonth(date: Date) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function formatEventTime(event: Event) {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    if (event.is_all_day) {
      return "All day";
    }

    // Check if it's a multi-day event
    const startDate = start.toDateString();
    const endDate = end.toDateString();

    if (startDate !== endDate) {
      // Multi-day event
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      return `${days} day${days > 1 ? "s" : ""} • ${start.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      )} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }

    // Same day event
    return `${start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} - ${end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  function getEventColorConfig(event: Event) {
    const color = event.color || "blue";
    return getEventColorClasses(color);
  }

  function getEventDisplayInfo(event: Event, currentDay: Date) {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const isMultiDay = start.toDateString() !== end.toDateString();

    if (isMultiDay) {
      // For multi-day events, show different info based on the day
      const currentDayStart = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate()
      );
      const currentDayEnd = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        23,
        59,
        59
      );

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

  function openEventCreator(dateMessage?: string, date?: Date) {
    // Only clear editingEvent if we're not already in edit mode
    if (!editingEvent) {
      editingEvent = null;
    }
    initialMessage = "";

    if (dateMessage && date) {
      // Create a context message for the date
      contextMessage = {
        role: "user",
        content: dateMessage,
        timestamp: new Date(),
        isContext: true,
        date: date,
      };
    } else {
      contextMessage = null;
    }

    showEventCreatorDrawer = true;
  }

  function openEventEditor(event: Event) {
    editingEvent = event;
    showEventCreatorDrawer = true;
  }

  function openEventCard(event: Event) {
    eventStoreActions.openEventCard(event);
  }

  function handleEventCreated(detail?: any) {
    showEventCreatorDrawer = false;
    initialMessage = ""; // Clear initial message
    contextMessage = null; // Clear context message

    // If we have event data, update locally instead of full reload
    if (detail?.event) {
      handleSingleEventUpdate(detail.event);
    } else if (detail?.events) {
      handleMultipleEventsUpdate(detail.events);
    } else if (!detail?.autoSaved) {
      // Only do full reload if no event data provided and it's not an auto-save
      loadEvents();
    }
  }

  function handleSingleEventUpdate(eventData: any) {
    if (editingEvent) {
      // Update existing event
      events = events.map((event) =>
        event.id === editingEvent.id
          ? { ...event, ...eventData, id: editingEvent.id }
          : event
      );
    } else {
      // Add new event - generate a temporary ID if not provided
      const newEvent = {
        ...eventData,
        id: eventData.id || `temp-${Date.now()}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };
      events = [...events, newEvent];
    }
  }

  function handleMultipleEventsUpdate(eventsData: any[]) {
    // Add multiple new events
    const newEvents = eventsData.map((eventData, index) => ({
      ...eventData,
      id: eventData.id || `temp-${Date.now()}-${index}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
    }));
    events = [...events, ...newEvents];
  }

  function handleEventDeleted() {
    // Reload events when an event is deleted
    loadEvents();
    showEventCardDrawer = false;
    initialMessage = ""; // Clear initial message
    contextMessage = null; // Clear context message
  }

  async function handleDeleteEventFromCard(event: CustomEvent) {
    if (!event.detail || !event.detail.eventId) {
      console.error("Cannot delete event: event detail is missing");
      return;
    }
    
    const eventId = event.detail.eventId;
    
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)
        .eq("user_id", user.id); // Ensure user can only delete their own events

      if (error) throw error;

      // Remove event from local state and reload
      events = events.filter((e) => e.id !== eventId);
      loadEvents(); // Also reload to be sure
      showEventCardDrawer = false;
      selectedEvent = null;
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Failed to delete event. Please try again.");
    }
  }

  function handleEditEvent(event: CustomEvent) {
    editingEvent = event.detail.event;
    showEventCardDrawer = false;
    showEventCreatorDrawer = true;
  }

  function handleDayViewEventClick(event: Event) {
    editingEvent = event;
    // Keep day view drawer open, just open event creator on top
    showEventCreatorDrawer = true;
  }

  function handleDayViewCreateEvent(date: Date) {
    // Keep day view drawer open, just open event creator on top
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const message = `I want to schedule something for ${dateStr}`;
    openEventCreator(message, date);
  }

  // Clear selectedEvent when drawer closes
  $effect(() => {
    if (!showEventCardDrawer) {
      selectedEvent = null;
    }
  });

  // Clear initial message when event creator drawer closes
  $effect(() => {
    if (!showEventCreatorDrawer) {
      initialMessage = "";
      contextMessage = null;
    }
  });

  function handleDayClick(day: CalendarDay) {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;

    // Clear any existing timeout
    if (tapTimeout) {
      clearTimeout(tapTimeout);
      tapTimeout = null;
    }

    // Check if this is a double tap (within 300ms)
    if (timeDiff < 300 && timeDiff > 50) {
      // Double tap detected - open event creator
      const dateStr = day.date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const message = `I want to schedule something for ${dateStr}`;
      openEventCreator(message, day.date);
    } else {
      // Single tap - delay to check for double tap
      tapTimeout = setTimeout(() => {
        selectDate(day);
        tapTimeout = null;
      }, 300);
    }

    lastTapTime = currentTime;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === '/' && !showEventCreatorDrawer) {
      event.preventDefault();
      eventInput?.focus();
    }
  }

  onMount(() => {
    loadEvents();
    checkMobile();
    
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    // Set CSS custom property for mobile viewport height
    function setMobileVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }

    // Set initial mobile viewport height
    setMobileVH();

    // Listen for window resize to update mobile state and viewport height
    function handleResize() {
      checkMobile();
      setMobileVH();
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", setMobileVH);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", setMobileVH);
      window.removeEventListener("keydown", handleKeyDown);
      // Clean up any pending timeout
      if (tapTimeout) {
        clearTimeout(tapTimeout);
      }
    };
  });
</script>

<div class="h-full flex flex-col pt-4 pb-0 overscroll-none">
  <!-- Month Navigation and Add Button -->
  <div class="flex justify-between mx-2">
    <!-- Settings Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="icon" class="h-8 w-8">
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            ></path>
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-56">
        <DropdownMenuCheckboxItem bind:checked={showWeekends}>
          Show Weekends
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onclick={() => dispatch("logout")}>
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            ></path>
          </svg>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Month Navigation -->
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        onclick={previousMonth}
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          ></path>
        </svg>
      </Button>
      <span class="text-lg sm:text-xl font-semibold text-foreground"
        >{formatMonth(currentDate)}</span
      >
      <Button variant="ghost" size="icon" class="h-8 w-8" onclick={nextMonth}>
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          ></path>
        </svg>
      </Button>
    </div>


  </div>

  <!-- Calendar Container -->
  <div class="flex-1 flex flex-col overflow-hidden overscroll-none">
    <div
      class="flex-1 grid grid-cols-1 {isMobile
        ? 'grid-cols-1'
        : 'xl:grid-cols-3'} gap-4 sm:gap-6 overflow-hidden"
    >
      <!-- Calendar Grid -->
      <div
        class="{isMobile
          ? 'col-span-1'
          : 'xl:col-span-2'} flex flex-col overflow-hidden"
      >
        <Card class="rounded-none flex-1 flex flex-col overflow-hidden">
          <CardContent
            class="px-1 py-0 flex-1 flex flex-col overflow-hidden min-h-0"
          >
            {#if loading}
              <div class="flex items-center justify-center h-64">
                <div
                  class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"
                ></div>
              </div>
            {:else}
              <!-- Week headers -->
              <div
                class="grid mb-2 {showWeekends ? 'grid-cols-7' : 'grid-cols-5'}"
              >
                {#each weekDays as day, index}
                  <div
                    class="p-1 text-center text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {day}
                  </div>
                {/each}
              </div>

              <!-- Calendar Content -->
              <div class="flex-1 relative min-h-0">
                <div
                  class="h-full grid gap-1 {showWeekends
                    ? 'grid-cols-7 grid-rows-6'
                    : 'grid-cols-5 grid-rows-6'} min-h-0"
                >
                  {#each getCalendarDays(currentDate) as day, dayIndex}
                    <Button
                      variant="ghost"
                      class="h-full flex flex-col items-start justify-start p-0 rounded-md border border-transparent
                             {day.isCurrentMonth
                        ? ''
                        : 'text-muted-foreground opacity-50'}
                             {day.isSelected
                        ? 'bg-accent text-accent-foreground border-accent'
                        : ''}
                             {day.isToday
                        ? 'bg-primary/10 text-primary ring-2 ring-primary/50'
                        : ''}
                             hover:bg-accent/50 hover:border-accent/50 transition-colors"
                      onclick={() => handleDayClick(day)}
                    >
                      <span
                        class="text-sm sm:text-base font-semibold leading-none mb-1"
                      >
                        {day.day}
                      </span>

                      <!-- Event indicators -->
                      <div class="flex-1 w-full space-y-1 overflow-hidden">
                        {#each day.events
                          .slice(0, 3)
                          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()) as event, eventIndex}
                          {@const eventInfo = getEventDisplayInfo(
                            event,
                            day.date
                          )}
                          {@const colorConfig = getEventColorConfig(event)}
                          {#if isMobile}
                            <div
                              class="group rounded px-0.5 py-0.5 {colorConfig.bg}  {colorConfig.border}"
                            >
                              <span
                                class="text-xs sm:text-sm truncate {colorConfig.text} font-medium"
                              >
                                {eventInfo.title}
                                {#if event.is_all_day}
                                  <span class="text-muted-foreground">
                                    • All day</span
                                  >
                                {:else}
                                  {@const startTime = new Date(
                                    event.start_time
                                  )}
                                  <span class="text-muted-foreground">
                                    • {startTime.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      hour12: true,
                                    })}</span
                                  >
                                {/if}
                              </span>
                            </div>
                          {:else}
                            <button
                              type="button"
                              class="group rounded px-1 py-0.5 {colorConfig.bg} {colorConfig.hover} border-l-2 {colorConfig.border} cursor-pointer w-full text-left"
                              onclick={(e) => {
                                e.stopPropagation();
                                openEventEditor(event);
                              }}
                            >
                              <span
                                class="text-xs sm:text-sm truncate {colorConfig.text} font-medium"
                              >
                                {eventInfo.title}
                                {#if event.is_all_day}
                                  <span class="text-muted-foreground">
                                    • All day</span
                                  >
                                {:else}
                                  {@const startTime = new Date(
                                    event.start_time
                                  )}
                                  <span class="text-muted-foreground">
                                    • {startTime.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      hour12: true,
                                    })}</span
                                  >
                                {/if}
                              </span>
                            </button>
                          {/if}
                        {/each}

                        {#if day.events.length > 3}
                          <div
                            class="text-xs sm:text-sm text-primary font-medium pl-2.5"
                          >
                            +{day.events.length - 3} more
                          </div>
                        {/if}
                      </div>
                    </Button>
                  {/each}
                </div>
              </div>
            {/if}
          </CardContent>
          <div class="p-2 sm:p-4 border-t">
            <input 
              bind:this={eventInput}
              type="text" 
              placeholder={isMobile ? "Tap to add event..." : "Press '/' to add a new event..."}
              class="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onfocus={() => openEventCreator()}
            />
          </div>
        </Card>
      </div>

      <!-- Selected Day Events - Hidden on mobile -->
      {#if !isMobile}
        <div class="flex flex-col min-h-0">
          <Card class="flex-1 rounded-none flex flex-col min-h-0">
            <CardHeader class="pb-3">
              <CardTitle class="text-lg sm:text-xl">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3 p-3 sm:p-4 scroll-area flex-1">
              {#if selectedDate}
                {@const dayEvents = events
                  .filter((event) => {
                    const eventStart = new Date(event.start_time);
                    const eventEnd = new Date(event.end_time);
                    const dayStart = new Date(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate()
                    );
                    const dayEnd = new Date(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate(),
                      23,
                      59,
                      59
                    );

                    return eventStart <= dayEnd && eventEnd >= dayStart;
                  })
                  .sort(
                    (a, b) =>
                      new Date(a.start_time).getTime() -
                      new Date(b.start_time).getTime()
                  )}

                {#if dayEvents.length === 0}
                  <p class="text-muted-foreground text-sm">
                    No events scheduled
                  </p>
                {:else}
                  {#each dayEvents as event}
                    {@const colorConfig = getEventColorConfig(event)}
                    <Card
                      class="border-l-4 {colorConfig.border} hover:shadow-md transition-shadow cursor-pointer"
                      onclick={() => openEventEditor(event)}
                    >
                      <CardContent class="p-3">
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                              <h4 class="font-semibold text-sm sm:text-base">
                                {event.title}
                              </h4>
                              <Badge class="text-xs {colorConfig.badge}">
                                {getEventColorName(event.color || "blue")}
                              </Badge>
                            </div>
                            <p
                              class="text-xs sm:text-sm text-muted-foreground mt-1"
                            >
                              {formatEventTime(event)}
                            </p>
                            {#if event.location}
                              <p
                                class="text-xs sm:text-sm text-muted-foreground mt-1"
                              >
                                📍 {event.location}
                              </p>
                            {/if}
                            {#if event.confidence && event.confidence < 70}
                              <Badge variant="destructive" class="mt-2 text-xs">
                                ⚠️ Low confidence
                              </Badge>
                            {/if}
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
      {/if}
    </div>
  </div>

  <!-- Event Creator Drawer -->
  <EventCreatorDrawer
    {user}
    {editingEvent}
    {initialMessage}
    {contextMessage}
    bind:open={showEventCreatorDrawer}
    onEventCreated={(detail) => handleEventCreated(detail)}
    onEventDeleted={handleEventDeleted}
  />

  <!-- Event Card Drawer -->
  <EventCardDrawer {user} />

  <!-- Day View Drawer - For mobile -->
  <DayViewDrawer
    {selectedDate}
    {events}
    bind:open={showDayViewDrawer}
    onEventClick={handleDayViewEventClick}
    onCreateEvent={handleDayViewCreateEvent}
  />
</div>
