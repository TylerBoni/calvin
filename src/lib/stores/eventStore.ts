import { writable } from 'svelte/store';
import type { Event } from '../types/event';

type EventStore = {
  selectedEvent: Event | null;
  showEventCardDrawer: boolean;
};

const createEventStore = () => {
  const { subscribe, set, update } = writable<EventStore>({
    selectedEvent: null,
    showEventCardDrawer: false,
  });

  return {
    subscribe,
    openEventCard: (event: Event) => {
      update(store => ({
        ...store,
        selectedEvent: event,
        showEventCardDrawer: true,
      }));
    },
    closeEventCard: () => {
      update(store => ({
        ...store,
        selectedEvent: null,
        showEventCardDrawer: false,
      }));
    },
    reset: () => {
      set({
        selectedEvent: null,
        showEventCardDrawer: false,
      });
    },
  };
};

export const eventStore = createEventStore();
export const eventStoreActions = {
  openEventCard: eventStore.openEventCard,
  closeEventCard: eventStore.closeEventCard,
  reset: eventStore.reset,
};
