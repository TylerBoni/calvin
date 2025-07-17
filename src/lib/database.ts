import { supabase } from './supabase';
import type { Database } from './database.types';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

// Event functions
export async function getEvents(userId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (startDate) {
    query = query.gte('start_time', startDate);
  }
  if (endDate) {
    query = query.lte('end_time', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Event[];
}

export async function createEvent(event: EventInsert) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function updateEvent(id: string, updates: EventUpdate) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// User preferences functions
export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  return data as UserPreferences | null;
}

export async function createUserPreferences(userId: string, timezone: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .insert({
      user_id: userId,
      timezone,
      default_meeting_duration: 30,
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      notification_preferences: {
        email: true,
        push: false
      }
    })
    .select()
    .single();

  if (error) throw error;
  return data as UserPreferences;
}

export async function updateUserPreferences(userId: string, updates: Partial<UserPreferences>) {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserPreferences;
} 