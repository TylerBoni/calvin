import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, varchar, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - for authentication and profile data
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  emailVerified: boolean('email_verified').default(false),
  provider: text('provider').default('credentials'), // 'credentials', 'google', 'github'
  providerId: text('provider_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// User preferences table
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  timezone: text('timezone').default('America/New_York').notNull(),
  defaultMeetingDuration: integer('default_meeting_duration').default(30).notNull(), // minutes
  workingHoursStart: text('working_hours_start').default('09:00').notNull(),
  workingHoursEnd: text('working_hours_end').default('17:00').notNull(),
  weekStartsOn: integer('week_starts_on').default(0).notNull(), // 0 = Sunday, 1 = Monday
  reminderDefaults: jsonb('reminder_defaults').default(['15m', '1h']).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Events table - calendar events with AI-extracted metadata
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  isAllDay: boolean('is_all_day').default(false).notNull(),
  location: text('location'),
  
  // AI extracted data
  originalInput: text('original_input'), // The natural language input
  confidence: integer('confidence'), // AI confidence score 0-100
  aiExtractedData: jsonb('ai_extracted_data'), // Raw AI extraction results
  
  // Recurrence
  isRecurring: boolean('is_recurring').default(false).notNull(),
  recurrenceRule: text('recurrence_rule'), // RRULE format
  recurrenceParentId: uuid('recurrence_parent_id'), // Will reference events.id but can't self-reference
  
  // Status
  status: text('status').default('confirmed').notNull(), // 'tentative', 'confirmed', 'cancelled'
  
  // Reminders
  reminders: jsonb('reminders').default([]).notNull(), // Array of reminder times
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// AI conversations table - chat history for follow-up questions
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  
  // Conversation data
  messages: jsonb('messages').notNull(), // Array of {role, content, timestamp}
  status: text('status').default('active').notNull(), // 'active', 'completed', 'abandoned'
  context: jsonb('context'), // Additional context for the conversation
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Sessions table for authentication
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull()
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  events: many(events),
  conversations: many(aiConversations),
  preferences: one(userPreferences),
  sessions: many(sessions)
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id]
  }),
  conversations: many(aiConversations),
  parent: one(events, {
    fields: [events.recurrenceParentId],
    references: [events.id]
  }),
  children: many(events)
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id]
  })
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id]
  }),
  event: one(events, {
    fields: [aiConversations.eventId],
    references: [events.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert; 