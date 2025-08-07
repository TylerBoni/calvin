export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  color?: string;
  confidence?: number;
  user_id: string;
  is_all_day?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string;
  created_at?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  color?: string;
  confidence?: number;
  user_id: string;
  is_all_day?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  color?: string;
  confidence?: number;
  is_all_day?: boolean;
}

export interface DrawerStates {
  eventCard: boolean;
  eventCreator: boolean;
  dayView: boolean;
}

export interface EventFilters {
  startDate: Date;
  endDate: Date;
  searchTerm?: string;
  colors?: string[];
}
