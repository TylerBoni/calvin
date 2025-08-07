<script lang="ts">
  import EventCreator from './EventCreator.svelte';
  import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '$lib/components/ui/drawer';
  import { Button } from '$lib/components/ui/button';

  let { 
    user, 
    editingEvent, 
    initialMessage = '',
    contextMessage = null,
    open = $bindable(false),
    onEventCreated,
    onEventDeleted
  } = $props<{
    user: any;
    editingEvent?: any;
    initialMessage?: string;
    contextMessage?: any;
    open?: boolean;
    onEventCreated?: (detail: any) => void;
    onEventDeleted?: (detail: any) => void;
  }>();

  let eventCreatorRef: EventCreator;
  let previousOpen = open;

  // Watch for drawer close and trigger auto-save
  $effect(() => {
    if (previousOpen && !open && eventCreatorRef) {
      // Drawer was closed, attempt auto-save
      handleDrawerClose();
    }
    previousOpen = open;
  });

  let isHandlingEventOperation = false;

  async function handleDrawerClose() {
    // Skip auto-save if we're already handling an event operation (create/delete)
    if (isHandlingEventOperation) return;
    
    if (eventCreatorRef?.hasUnsavedChanges()) {
      const savedEvent = await eventCreatorRef.autoSave();
      if (savedEvent) {
        // Delay the callback to allow drawer animation to complete smoothly
        setTimeout(() => {
          onEventCreated?.(savedEvent);
        }, 300);
      }
    }
  }

  function handleViewChange(event: CustomEvent) {
    // Close the drawer when navigating away
    if (event.detail.view === 'calendar') {
      open = false;
    }
  }

  function handleEventCreated(event: CustomEvent) {
    isHandlingEventOperation = true;
    open = false;
    
    // Delay the callback to allow drawer animation to complete smoothly
    setTimeout(() => {
      onEventCreated?.(event.detail);
      // Reset the flag after the callback
      isHandlingEventOperation = false;
    }, 300); // Match typical drawer animation duration
  }

  function handleEventDeleted(detail: { eventId: string }) {
    isHandlingEventOperation = true;
    open = false;
    
    // Delay the callback to allow drawer animation to complete smoothly
    setTimeout(() => {
      onEventDeleted?.(detail);
      // Reset the flag after the callback
      isHandlingEventOperation = false;
    }, 300);
  }
</script>

<Drawer bind:open>
  <DrawerContent class="h-[100dvh] max-h-[100dvh] z-60">
    <div class="flex-1 overflow-hidden h-full">
      <EventCreator 
        bind:this={eventCreatorRef}
        {user} 
        {editingEvent}
        {initialMessage}
        {contextMessage}
        on:viewChange={handleViewChange}
        on:eventCreated={handleEventCreated}
        on:eventDeleted={(event) => handleEventDeleted(event.detail)}
      />
    </div>
  </DrawerContent>
</Drawer>
