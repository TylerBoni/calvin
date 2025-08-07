import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

interface RequestBody {
  input: string;
  context: {
    currentDate: string;
    timezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    conversation?: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
    eventData?: any;
    eventsData?: Array<any>;
    previousEvents?: Array<any>;
    isFollowUp?: boolean;
    isEditing?: boolean;
    editingEvent?: any;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || ''
})

function createLocalDateTime(dateStr: string, timeStr: string, timezone: string): string {
  // Parse the date string to get year, month, day
  const targetDate = new Date(dateStr);
  
  // Extract hours and minutes from time string (e.g. "7:00 AM" or "19:00")
  const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeParts) {
    return targetDate.toISOString();
  }
  
  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  const ampm = timeParts[3]?.toUpperCase();
  
  // Convert to 24-hour format
  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  
  // Create the datetime string in ISO format WITHOUT the Z (which indicates UTC)
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  
  // Return ISO string WITHOUT timezone indicator (no Z)
  return `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { input, context } = await req.json() as RequestBody

    if (!input) {
      return new Response(
        JSON.stringify({ error: 'No input provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const messages = [
      { 
        role: 'system', 
        content: `You are a helpful calendar assistant. When scheduling events:
        - Suggest appropriate times based on activity type (workouts in morning/evening, meetings during work hours)
        - Consider what makes sense for humans (no workouts at 2am)
        - If no specific time given, suggest reasonable defaults for FUTURE dates/times
        - ALWAYS suggest times that are in the future, never in the past
        - User is in timezone: ${context.timezone}
        - Current local time: ${new Date(context.currentDate).toLocaleString('en-US', { timeZone: context.timezone })}
        - Working hours: ${context.workingHours.start} - ${context.workingHours.end}
        
        When suggesting times, use the user's local timezone and be specific about dates.
        If user says "tomorrow" or relative dates, calculate the actual date.
        If user just says a time like "7am", assume it's for the next appropriate day (today if time hasn't passed, tomorrow if it has).
        
        IMPORTANT: If the user requests multiple events (like "schedule multiple meetings" or "create a series of events"), create multiple events with appropriate spacing and progression.
        For recurring activities, create a series of events with logical progression and variety.
        When users say things like "that doesn't feel like enough" or ask for more comprehensive programs, create additional events to provide a complete schedule.
        
        ${context.isEditing && context.editingEvent ? `IMPORTANT: You are currently editing an existing event:
        - Original event: "${context.editingEvent.title}"
        - Original time: ${context.editingEvent.startTime} to ${context.editingEvent.endTime}
        - Original location: ${context.editingEvent.location || 'No location specified'}
        
        The user wants to modify this event. Only change the fields they specifically mention. If they don't mention a field, keep the original value.` : ''}`
      }
    ];

    // Add conversation history for follow-ups
    if (context.isFollowUp && context.conversation) {
      context.conversation.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });

      if (context.eventData) {
        messages.push({
          role: 'assistant',
          content: `Current event: ${context.eventData.title} at ${context.eventData.startTime}`
        });
      }
    }

    // Add context about previously created events
    if (context.previousEvents && context.previousEvents.length > 0) {
      const eventSummary = context.previousEvents.map((event: any, index: number) => 
        `${index + 1}. ${event.title} on ${new Date(event.startTime).toLocaleDateString()}`
      ).join('\n');
      
      messages.push({
        role: 'system',
        content: `Previously created events:\n${eventSummary}\n\nWhen users ask for "more" training or say "that doesn't feel like enough", they want additional comprehensive training sessions beyond what was already created.`
      });
    }

    // Add editing context if we're editing an existing event
    if (context.isEditing && context.editingEvent) {
      messages.push({
        role: 'system',
        content: `You are editing an existing event. Here are the current details:
        Title: ${context.editingEvent.title}
        Start Time: ${context.editingEvent.startTime}
        End Time: ${context.editingEvent.endTime}
        Location: ${context.editingEvent.location || 'Not specified'}
        
        The user wants to modify this event. Only update the fields they specifically mention.`
      });
    }

    messages.push({ role: 'user', content: input });

    messages.push({
      role: 'system',
      content: `Extract event details and return JSON with:
      - events: array of event objects (use this for multiple events)
      - title: single event title (use this for single events)
      - startDate: date in YYYY-MM-DD format (ensure this is a FUTURE date)
      - startTime: time in "H:MM AM/PM" format (suggest appropriate time if none given)
      - endTime: end time in "H:MM AM/PM" format (estimate duration)
      - description: brief description
      - location: location if mentioned
      - color: suggested color category (yellow, orange, blue, purple, green, red, black, pink)
      - confidence: 0-100 (how sure you are)
      - questions: array of follow-up questions if needed
      - chatMessage: natural language response explaining what you scheduled
      
      Color categorization guide:
      - yellow: energy, joy, warmth (parties, celebrations, fun activities)
      - orange: creativity, enthusiasm, excitement (workshops, brainstorming, meetings)
      - blue: calm, patience, security (appointments, consultations, therapy)
      - purple: ambition, wisdom, power (leadership, strategy, executive meetings)
      - green: growth, healing, balance (health, wellness, exercise, nature)
      - red: action, attention, determination (urgent, deadlines, important)
      - black: formality, mystery, sophistication (business, interviews, presentations)
      - pink: kindness, sensitivity, optimism (romantic, dates, care, support)
      
      For multiple events, return an "events" array with multiple event objects.
      Each event object should have: title, startDate, startTime, endTime, description, location, color.
      
      For single events, return individual fields: title, startDate, startTime, endTime, description, location, color.
      
      When users ask for "more" events or say "that doesn't feel like enough", create additional events to provide a complete schedule.
      
      ${context.isEditing ? `IMPORTANT: You are editing an existing event. Only include fields that the user specifically wants to change. If they don't mention a field, use the original value from the editing context.` : 'IMPORTANT: Make sure startDate is always in the future, never today if the time has already passed.'}`
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.3,
      max_tokens: 1000, // Increased for multiple events
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from AI')
    }

    try {
      const parsed = JSON.parse(responseText)
      
      // Handle multiple events
      if (parsed.events && Array.isArray(parsed.events)) {
        const processedEvents = parsed.events.map((event: any) => {
          let startTime = '';
          let endTime = '';
          
          if (event.startDate && event.startTime) {
            startTime = createLocalDateTime(event.startDate, event.startTime, context.timezone);
          }
          
          if (event.startDate && event.endTime) {
            endTime = createLocalDateTime(event.startDate, event.endTime, context.timezone);
          }
          
          return {
            title: event.title,
            startTime: startTime,
            endTime: endTime,
            description: event.description,
            location: event.location,
            color: event.color || 'blue',
            confidence: parsed.confidence || 80
          };
        });

        return new Response(
          JSON.stringify({
            events: processedEvents,
            confidence: parsed.confidence || 80,
            questions: parsed.questions || [],
            chatResponse: parsed.chatMessage || `I've scheduled ${processedEvents.length} events for you.`,
            originalInput: input,
            isMultipleEvents: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Handle single event (existing logic)
      let startTime = '';
      let endTime = '';
      
      if (parsed.startDate && parsed.startTime) {
        startTime = createLocalDateTime(parsed.startDate, parsed.startTime, context.timezone);
      }
      
      if (parsed.startDate && parsed.endTime) {
        endTime = createLocalDateTime(parsed.startDate, parsed.endTime, context.timezone);
      }

      // For editing, preserve original values if not specified in the response
      let finalTitle = parsed.title;
      let finalStartTime = startTime;
      let finalEndTime = endTime;
      let finalLocation = parsed.location;
      let finalDescription = parsed.description;
      let finalColor = parsed.color || 'blue';

      if (context.isEditing && context.editingEvent) {
        // Use original values if not specified in the AI response
        finalTitle = parsed.title || context.editingEvent.title;
        finalStartTime = startTime || context.editingEvent.startTime;
        finalEndTime = endTime || context.editingEvent.endTime;
        finalLocation = parsed.location !== undefined ? parsed.location : context.editingEvent.location;
        finalDescription = parsed.description !== undefined ? parsed.description : context.editingEvent.description;
        finalColor = parsed.color || context.editingEvent.color || 'blue';
      }

      // Return clean response for single event
      return new Response(
        JSON.stringify({
          title: finalTitle,
          startTime: finalStartTime,
          endTime: finalEndTime,
          description: finalDescription,
          location: finalLocation,
          color: finalColor,
          confidence: parsed.confidence || 80,
          questions: parsed.questions || [],
          chatResponse: parsed.chatMessage || `I've ${context.isEditing ? 'updated' : 'scheduled'} "${finalTitle}" for ${finalStartTime}`,
          originalInput: input,
          isMultipleEvents: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      console.error('JSON parse error:', error, 'Response was:', responseText);
      return new Response(
        JSON.stringify({
          confidence: 20,
          questions: [`I couldn't understand "${input}". Could you be more specific about the event details?`],
          chatResponse: "I'm having trouble understanding your request. Could you provide more details?",
          originalInput: input
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
