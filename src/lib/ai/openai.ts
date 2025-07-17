import OpenAI from 'openai';
import { AI_CONFIG, type AIResponse } from '../config/ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
      const prompt = AI_CONFIG.extractionPrompt
        .replace('{input}', input)
        .replace('{currentDate}', context.currentDate.toISOString())
        .replace('{timezone}', context.timezone)
        .replace('{workingHours}', `${context.workingHours.start} - ${context.workingHours.end}`);

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: AI_CONFIG.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxTokens,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from AI');
      }

      // Try to parse the JSON response
      try {
        const parsed = JSON.parse(responseText) as AIResponse;
        return {
          ...parsed,
          originalInput: input
        };
      } catch {
        // If JSON parsing fails, create a basic response
        return {
          originalInput: input,
          confidence: 20,
          questions: [`I couldn't fully understand "${input}". Could you please provide more details about the date and time?`]
        };
      }
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
      const history = conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = AI_CONFIG.followupPrompt
        .replace('{history}', history)
        .replace('{response}', response)
        .replace('{eventData}', JSON.stringify(partialEventData));

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: AI_CONFIG.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxTokens,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from AI');
      }

      // Parse the AI response for updated event data and next message
      // This is a simplified approach - in production you'd want more robust parsing
      const lines = responseText.split('\n');
      let message = responseText;
      let updatedEventData = partialEventData;
      let isComplete = false;

      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          updatedEventData = { ...partialEventData, ...extracted };
          
          // Remove JSON from message
          message = responseText.replace(jsonMatch[0], '').trim();
          
          // Check if we have enough info to create the event
          isComplete = !!(extracted.title && extracted.startTime && extracted.endTime);
        } catch {
          // JSON parsing failed, use original data
        }
      }

      return {
        message: message || "Could you provide more details?",
        updatedEventData,
        isComplete
      };
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
      const prompt = `Given this event request and existing calendar, suggest optimal times:

Event request: ${JSON.stringify(eventDetails)}
Existing events: ${JSON.stringify(existingEvents)}
Preferences: ${JSON.stringify(preferences)}

Provide 3-5 specific time suggestions as ISO datetime strings.`;

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: 'You are a scheduling assistant. Provide specific datetime suggestions in ISO format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const response = completion.choices[0]?.message?.content || '';
      
      // Extract datetime strings from response
      const dateTimeRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;
      const suggestions = response.match(dateTimeRegex) || [];
      
      return suggestions.slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error('Suggestion generation error:', error);
      return [];
    }
  }
}

export const aiService = new AICalendarService(); 