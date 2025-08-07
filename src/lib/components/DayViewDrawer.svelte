<script lang="ts">
  import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '$lib/components/ui/drawer';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { getEventColorClasses, getEventColorName, type EventColor } from '../utils/colors';

  type Event = {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    is_all_day?: boolean;
    location?: string;
    confidence?: number;
    color?: EventColor;
    user_id: string;
    created_at?: string;
  };

  let {
    selectedDate = $bindable(),
    events = [],
    open = $bindable(false),
    onEventClick = () => {},
    onCreateEvent = () => {}
  }: {
    selectedDate: Date;
    events: Event[];
    open: boolean;
    onEventClick: (event: Event) => void;
    onCreateEvent: (date: Date) => void;
  } = $props();

  // Filter events for the selected date
  let dayEvents = $derived(
    events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
      
      return eventStart <= dayEnd && eventEnd >= dayStart;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  );

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

  function getEventColorConfig(event: Event) {
    const color = event.color || 'blue';
    return getEventColorClasses(color);
  }
</script>

<Drawer bind:open>
  <DrawerContent class="max-h-[90vh]">
    <DrawerHeader class="pb-4">
      <DrawerTitle class="text-xl">
        {selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}
      </DrawerTitle>
    </DrawerHeader>
    
    <div class="px-4 pb-4 scroll-area flex-1">
      <div class="space-y-3">
        {#if dayEvents.length === 0}
          <div class="text-center py-8">
            <p class="text-muted-foreground text-sm mb-4">
              No events scheduled for this day
            </p>
            <Button 
              variant="outline" 
              onclick={() => onCreateEvent(selectedDate)}
              class="gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Event
            </Button>
          </div>
        {:else}
          {#each dayEvents as event}
            {@const colorConfig = getEventColorConfig(event)}
            <Card 
              class="border-l-4 {colorConfig.border} hover:shadow-md transition-shadow cursor-pointer"
              onclick={() => onEventClick(event)}
            >
              <CardContent class="p-4">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <h4 class="font-semibold text-base">
                        {event.title}
                      </h4>
                      <Badge class="text-xs {colorConfig.badge}">
                        {getEventColorName(event.color || 'blue')}
                      </Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">
                      {formatEventTime(event)}
                    </p>
                    {#if event.location}
                      <p class="text-sm text-muted-foreground mt-1">
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
      </div>
    </div>

    <DrawerFooter class="pt-4">
      <div class="flex gap-2">
        <Button 
          variant="outline" 
          onclick={() => onCreateEvent(selectedDate)}
          class="flex-1 gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Event
        </Button>
        <DrawerClose asChild>
          <Button variant="secondary" class="flex-1">
            Close
          </Button>
        </DrawerClose>
      </div>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
