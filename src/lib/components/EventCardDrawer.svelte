<script lang="ts">
  import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '$lib/components/ui/drawer';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { getEventColorClasses, getEventColorName, type EventColor } from '../utils/colors';
  
  let { 
    event, 
    open = $bindable(false),
    onEditEvent,
    onDeleteEvent
  } = $props<{
    event: any;
    open?: boolean;
    onEditEvent?: (detail: any) => void;
    onDeleteEvent?: (detail: any) => void;
  }>();

  function formatEventTime(event: any) {
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

  function getEventColorConfig(event: any) {
    const color = event.color || 'blue';
    return getEventColorClasses(color);
  }

  function editEvent() {
    onEditEvent?.({ event });
    open = false;
  }

  function deleteEvent() {
    if (confirm('Are you sure you want to delete this event?')) {
      onDeleteEvent?.({ eventId: event.id });
      open = false;
    }
  }
</script>

<Drawer bind:open>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle class="flex items-center gap-2">
        <span>{event.title}</span>
        <Badge class="{getEventColorConfig(event).badge}">
          {getEventColorName(event.color || 'blue')}
        </Badge>
      </DrawerTitle>
    </DrawerHeader>
    
    <div class="flex-1 p-6 space-y-4">
      <!-- Event Details -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <span class="text-sm text-muted-foreground">{formatEventTime(event)}</span>
        </div>
        
        {#if event.location}
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="text-sm text-muted-foreground">{event.location}</span>
          </div>
        {/if}
        
        {#if event.description}
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Description</h4>
            <p class="text-sm text-muted-foreground">{event.description}</p>
          </div>
        {/if}
        
        {#if event.confidence && event.confidence < 70}
          <div class="flex items-center gap-2">
            <Badge variant="destructive" class="text-xs">
              ⚠️ Low confidence
            </Badge>
          </div>
        {/if}
      </div>
    </div>
    
    <DrawerFooter>
      <div class="flex gap-2 w-full">
        <Button variant="outline" onclick={editEvent} class="flex-1">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit
        </Button>
        <Button variant="destructive" onclick={deleteEvent}>
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Delete
        </Button>
      </div>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
