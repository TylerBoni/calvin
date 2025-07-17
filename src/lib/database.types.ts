export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          user_id: string
          is_recurring: boolean
          recurrence_rule: string | null
          ai_metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          user_id: string
          is_recurring?: boolean
          recurrence_rule?: string | null
          ai_metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          user_id?: string
          is_recurring?: boolean
          recurrence_rule?: string | null
          ai_metadata?: Json | null
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          created_at: string
          timezone: string
          default_meeting_duration: number
          working_hours_start: string
          working_hours_end: string
          notification_preferences: Json
        }
        Insert: {
          user_id: string
          created_at?: string
          timezone: string
          default_meeting_duration?: number
          working_hours_start?: string
          working_hours_end?: string
          notification_preferences?: Json
        }
        Update: {
          user_id?: string
          created_at?: string
          timezone?: string
          default_meeting_duration?: number
          working_hours_start?: string
          working_hours_end?: string
          notification_preferences?: Json
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 