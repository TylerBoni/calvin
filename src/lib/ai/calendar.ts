import { supabase } from '../supabase';
import type { AIResponse } from '../config/ai';

export class AICalendarService {
  /**
   * Parse natural language event description and extract structured data
   */
  async parseEventDescription(
    input: string,
    context: {
      currentDate: Date;
      timezone: string;
      workingHours: { start: string; end: string };
      userPreferences?: any;
    }
  ): Promise<AIResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('calendar-ai', {
        body: { input, context }
      });

      if (error) {
        console.error('AI parsing error:', error);
        return {
          originalInput: input,
          confidence: 0,
          questions: ['Sorry, I encountered an error processing your request. Could you please try again?']
        };
      }

      return {
        ...data,
        originalInput: input
      };
    } catch (error) {
      console.error('AI parsing error:', error);
      return {
        originalInput: input,
        confidence: 0,
        questions: ['I encountered an error processing your request. Could you please try rephrasing your event description?']
      };
    }
  }

  /**
   * Handle follow-up conversation for event clarification
   */
  async handleFollowUp(
    response: string,
    conversationHistory: Array<{ role: string; content: string; timestamp: Date }>,
    partialEventData: Partial<AIResponse>
  ): Promise<{ message: string; updatedEventData: Partial<AIResponse>; isComplete: boolean }> {
    try {
      const { data, error } = await supabase.functions.invoke('calendar-ai-followup', {
        body: {
          response,
          history: conversationHistory,
          eventData: partialEventData
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('AI follow-up error:', error);
      return {
        message: "I'm having trouble processing that. Could you please clarify?",
        updatedEventData: partialEventData,
        isComplete: false
      };
    }
  }

  /**
   * Generate smart scheduling suggestions
   */
  async generateSchedulingSuggestions(
    eventDetails: Partial<AIResponse>,
    existingEvents: Array<{ startTime: Date; endTime: Date; title: string }>,
    preferences: {
      workingHours: { start: string; end: string };
      timezone: string;
      defaultDuration: number;
    }
  ): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('calendar-ai-suggestions', {
        body: {
          eventDetails,
          existingEvents,
          preferences
        }
      });

      if (error) {
        throw error;
      }

      return data.suggestions;
    } catch (error) {
      console.error('Suggestion generation error:', error);
      return [];
    }
  }
}

export const aiService = new AICalendarService(); 