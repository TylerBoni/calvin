<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { supabase } from '../supabase';
  
  const dispatch = createEventDispatcher();
  
  let { user } = $props<{
    user: any;
  }>();

  let inputText = $state('');
  let loading = $state(false);
  let conversation = $state<Array<{ role: string; content: string; timestamp: Date }>>([]);
  let currentEventData = $state<any>(null);
  let showPreview = $state(false);
  let isComplete = $state(false);

  // Get user's timezone and working hours
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const workingHours = {
    start: '09:00',
    end: '17:00'
  };

  const examples = [
    "Meeting with John tomorrow at 2pm",
    "Doctor appointment next Friday morning",
    "Weekly team standup every Monday at 9am",
    "Lunch with Sarah sometime next week",
    "Coffee with client at 3pm today",
    "Birthday party this Saturday evening"
  ];

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    inputText = '';
    loading = true;

    // Add user message to conversation
    conversation = [...conversation, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }];

    try {
      if (conversation.length === 1) {
        // First message - parse the event using edge function
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'calendar-ai',
          {
            body: {
              input: userMessage,
              context: {
                currentDate: new Date().toISOString(),
                timezone: userTimezone,
                workingHours
              }
            }
          }
        );

        if (functionError) {
          console.error('Function error:', functionError);
          throw functionError;
        }

        currentEventData = {
          ...functionData,
          user_id: user.id
        };
          
        if (functionData.questions && functionData.questions.length > 0) {
          // AI has questions
          conversation = [...conversation, {
            role: 'assistant',
            content: functionData.questions[0],
            timestamp: new Date()
          }];
        } else if (functionData.confidence > 70) {
          // High confidence, show preview
          showPreview = true;
          isComplete = true;
          conversation = [...conversation, {
            role: 'assistant',
            content: 'Great! I\'ve extracted the event details. Please review and confirm.',
            timestamp: new Date()
          }];
        }
      } else {
        // Follow-up conversation
        const { data: functionData, error: functionError } = await supabase.functions.invoke('calendar-ai', {
          body: {
            input: userMessage,
            context: {
              currentDate: new Date().toISOString(),
              timezone: userTimezone,
              workingHours,
              conversation: conversation.slice(0, -1), // Exclude the current user message
              eventData: currentEventData
            }
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (functionError) throw functionError;

        currentEventData = {
          ...functionData,
          user_id: user.id
        };
        isComplete = functionData.confidence > 70;
          
        if (isComplete) {
          showPreview = true;
        }
          
        conversation = [...conversation, {
          role: 'assistant',
          content: functionData.questions?.[0] || 'Great! I\'ve updated the event details. Please review and confirm.',
          timestamp: new Date()
        }];
      }
    } catch (error) {
      console.error('AI processing error:', error);
      conversation = [...conversation, {
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }];
    } finally {
      loading = false;
    }
  }

  async function confirmEvent() {
    if (!currentEventData || !isComplete) return;

    loading = true;
    try {
      // First, ensure user preferences exist (required by foreign key constraint)
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (!existingPrefs) {
        // Create default user preferences if they don't exist
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            timezone: userTimezone,
            default_meeting_duration: 30,
            working_hours_start: workingHours.start,
            working_hours_end: workingHours.end
          });
      }

      // Now create the event
      const { error } = await supabase
        .from('events')
        .insert([{
          title: currentEventData.title,
          start_time: currentEventData.startTime,
          end_time: currentEventData.endTime,
          description: currentEventData.description,
          user_id: user.id
        }]);

      if (error) throw error;

      // Reset the form
      resetForm();
      
      // Dispatch event to notify parent component (like Calendar) to refresh
      dispatch('eventCreated', {
        event: {
          title: currentEventData.title,
          start_time: currentEventData.startTime,
          end_time: currentEventData.endTime,
          description: currentEventData.description,
          user_id: user.id
        }
      });
      
      conversation = [...conversation, {
        role: 'assistant',
        content: '✅ Event created successfully! You can view it in your calendar.',
        timestamp: new Date()
      }];
    } catch (error) {
      console.error('Event creation error:', error);
      conversation = [...conversation, {
        role: 'assistant',
        content: '❌ Failed to create event. Please try again.',
        timestamp: new Date()
      }];
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    inputText = '';
    conversation = [];
    currentEventData = null;
    showPreview = false;
    isComplete = false;
  }

  function useExample(example: string) {
    inputText = example;
  }

  function formatDateTime(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  onMount(() => {
    // Focus the input on mount
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) input.focus();
  });
</script>

<div class="max-w-4xl mx-auto">
  <div class="text-center mb-8">
    <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-4">
      Create Event with AI
    </h2>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Just describe your event naturally, and I'll help you schedule it.
    </p>
  </div>

  <div class="grid lg:grid-cols-3 gap-8">
    <!-- Main Chat Interface -->
    <div class="lg:col-span-2">
      <div class="glass rounded-2xl border border-white/20 overflow-hidden">
        <!-- Chat Messages -->
        <div class="h-96 overflow-y-auto p-6 space-y-4">
          {#if conversation.length === 0}
            <!-- Welcome message -->
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
              </div>
              <div class="flex-1">
                <div class="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-4">
                  <p class="text-slate-900 dark:text-white">
                    Hi! I'm your AI calendar assistant. Tell me about the event you'd like to schedule, and I'll help you create it. 
                    You can describe it naturally - like "Meeting with John tomorrow at 2pm" or "Doctor appointment next Friday morning".
                  </p>
                </div>
                <p class="text-xs text-slate-400 mt-1">AI Assistant</p>
              </div>
            </div>
          {/if}

          {#each conversation as message}
            <div class="flex items-start space-x-3 {message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}">
              <div class="w-8 h-8 {message.role === 'user' ? 'bg-slate-600' : 'bg-primary-500'} rounded-full flex items-center justify-center">
                {#if message.role === 'user'}
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                {:else}
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                {/if}
              </div>
              <div class="flex-1">
                <div class="bg-{message.role === 'user' ? 'slate-100 dark:bg-slate-700' : 'primary-50 dark:bg-primary-900/20'} rounded-2xl p-4">
                  <p class="text-slate-900 dark:text-white">{message.content}</p>
                </div>
                <p class="text-xs text-slate-400 mt-1 {message.role === 'user' ? 'text-right' : ''}">
                  {message.role === 'user' ? 'You' : 'AI Assistant'} • {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          {/each}

          {#if loading}
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div class="flex-1">
                <div class="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-4">
                  <p class="text-slate-600 dark:text-slate-300">Thinking...</p>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Input Area -->
        <div class="p-6 border-t border-white/10">
          <form onsubmit={handleSubmit} class="flex space-x-3">
            <input
              bind:value={inputText}
              type="text"
              placeholder="Describe your event... (e.g., Meeting with John tomorrow at 2pm)"
              class="flex-1 px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              class="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {#if showPreview && currentEventData}
        <!-- Event Preview -->
        <div class="mt-6 glass rounded-2xl p-6 border border-white/20">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Event Preview</h3>
          
          <div class="space-y-3">
            <div>
              <label class="text-sm font-medium text-slate-600 dark:text-slate-300">Title</label>
              <p class="text-slate-900 dark:text-white">{currentEventData.title || 'Untitled Event'}</p>
            </div>
            
            {#if currentEventData.startTime}
              <div>
                <label class="text-sm font-medium text-slate-600 dark:text-slate-300">Start Time</label>
                <p class="text-slate-900 dark:text-white">{formatDateTime(currentEventData.startTime)}</p>
              </div>
            {/if}
            
            {#if currentEventData.endTime}
              <div>
                <label class="text-sm font-medium text-slate-600 dark:text-slate-300">End Time</label>
                <p class="text-slate-900 dark:text-white">{formatDateTime(currentEventData.endTime)}</p>
              </div>
            {/if}
            
            {#if currentEventData.location}
              <div>
                <label class="text-sm font-medium text-slate-600 dark:text-slate-300">Location</label>
                <p class="text-slate-900 dark:text-white">{currentEventData.location}</p>
              </div>
            {/if}
            
            {#if currentEventData.description}
              <div>
                <label class="text-sm font-medium text-slate-600 dark:text-slate-300">Description</label>
                <p class="text-slate-900 dark:text-white">{currentEventData.description}</p>
              </div>
            {/if}
            
            {#if currentEventData.confidence}
              <div>
                <label class="text-sm font-medium text-slate-600 dark:text-slate-300">AI Confidence</label>
                <p class="text-slate-900 dark:text-white">{currentEventData.confidence}%</p>
              </div>
            {/if}
          </div>
          
          <div class="flex space-x-3 mt-6">
            <button
              onclick={confirmEvent}
              disabled={loading}
              class="flex-1 px-4 py-2 bg-success-600 hover:bg-success-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
            >
              Create Event
            </button>
            <button
              onclick={resetForm}
              class="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Examples Sidebar -->
    <div class="lg:col-span-1">
      <div class="glass rounded-2xl p-6 border border-white/20">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Try These Examples</h3>
        <div class="space-y-3">
          {#each examples as example}
            <button
              onclick={() => useExample(example)}
              class="w-full text-left p-3 bg-white/30 dark:bg-slate-800/30 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors text-sm text-slate-700 dark:text-slate-200"
            >
              "{example}"
            </button>
          {/each}
        </div>
        
        <div class="mt-6 pt-6 border-t border-white/10">
          <h4 class="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Tips</h4>
          <ul class="text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <li>• Be as specific as possible about dates and times</li>
            <li>• Mention locations if relevant</li>
            <li>• Include recurring patterns like "every Monday"</li>
            <li>• Use natural language - I understand context!</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div> 