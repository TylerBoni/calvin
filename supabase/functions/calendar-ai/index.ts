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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { input, context } = await req.json() as RequestBody

    // Validate required fields
    if (!input) {
      return new Response(
        JSON.stringify({ 
          error: 'No input provided',
          received: { input, context }
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Create the full prompt with all fields
    const prompt = `Given this event description and context, extract structured data:
    
Event: ${input}
Current date: ${context.currentDate}
Timezone: ${context.timezone}
Working hours: ${context.workingHours.start} - ${context.workingHours.end}

Return a JSON object with:
- title: event title
- startTime: ISO datetime
- endTime: ISO datetime
- description: full description
- location: location if specified
- attendees: array of attendees if specified
- confidence: number 0-100 indicating confidence in parsing
- questions: array of clarifying questions if needed`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful calendar assistant that extracts structured data from natural language.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from AI')
    }

    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(responseText)
      return new Response(
        JSON.stringify({ ...parsed, originalInput: input }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    } catch {
      // If JSON parsing fails, create a basic response
      return new Response(
        JSON.stringify({
          originalInput: input,
          confidence: 20,
          questions: [`I couldn't fully understand "${input}". Could you please provide more details about the date and time?`]
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
