export const AI_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,
  maxTokens: 500,
  systemPrompt: `You are a helpful calendar assistant that specializes in understanding natural language descriptions of events and extracting structured information from them.

Your role is to:
1. Parse natural language event descriptions
2. Extract dates, times, titles, locations, and other relevant details
3. Ask clarifying questions when information is ambiguous
4. Help users schedule events efficiently

When extracting information:
- Always try to infer the most likely date/time if possible
- Ask specific questions when details are unclear
- Consider working hours and common meeting patterns
- Handle recurring events intelligently
- Be conversational and helpful

Response format should include:
- extracted_data: Object with structured event data
- confidence: Number from 0-100 indicating extraction confidence
- questions: Array of clarifying questions if needed
- suggestions: Array of alternative interpretations if applicable`,

  extractionPrompt: `Extract event information from this natural language description. 
Consider the current date/time context and user preferences.

User input: "{input}"
Current date: {currentDate}
User timezone: {timezone}
User working hours: {workingHours}

Please extract and return a JSON object with:
{
  "title": "event title",
  "startTime": "ISO datetime string",
  "endTime": "ISO datetime string", 
  "location": "location if mentioned",
  "description": "additional details",
  "isAllDay": boolean,
  "confidence": 0-100,
  "isRecurring": boolean,
  "recurrencePattern": "description if recurring",
  "questions": ["clarifying questions if needed"],
  "originalInput": "original user input"
}`,

  followupPrompt: `Continue the conversation about scheduling this event. The user has provided additional information.

Conversation history: {history}
User's new response: "{response}"
Current partial event data: {eventData}

Please provide a helpful response and updated event data if the user provided clarification.`
};

export type AIResponse = {
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  isAllDay?: boolean;
  confidence: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
  questions?: string[];
  originalInput: string;
  suggestedTimes?: string[];
}; 