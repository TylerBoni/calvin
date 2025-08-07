<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { supabase } from '../supabase';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  
  const dispatch = createEventDispatcher();
  
  let { user, editingEvent } = $props<{
    user: any;
    editingEvent?: any;
  }>();

  let inputText = $state('');
  let loading = $state(false);
  let conversation = $state<Array<{
    role: string;
    content: string;
    timestamp: Date;
    eventData?: {
      title: string;
      startTime: string;
      endTime?: string;
      description?: string;
      location?: string;
      confidence: number;
    };
    eventsData?: Array<{
      title: string;
      startTime: string;
      endTime?: string;
      description?: string;
      location?: string;
      confidence: number;
    }>;
  }>>([]);
  let currentEventData = $state<any>(null);
  let currentEventsData = $state<Array<any>>([]);
  let showPreview = $state(false);
  let isComplete = $state(false);
  let isEditing = $state(false);
  let retryCount = $state(0);
  let timeoutId = $state<any>(null);
  let lastUserMessage = $state('');

  // Constants for timeout and retry
  const TIMEOUT_DURATION = 30000; // 30 seconds
  const MAX_RETRIES = 2;

  // Initialize editing mode and pre-fill data if editing an existing event
  onMount(() => {
    if (editingEvent) {
      isEditing = true;
      // Pre-fill the conversation with the existing event data
      const eventStart = new Date(editingEvent.start_time);
      const eventEnd = new Date(editingEvent.end_time);
      
      // Set current event data with existing event details
      currentEventData = {
        title: editingEvent.title,
        startTime: editingEvent.start_time,
        endTime: editingEvent.end_time,
        location: editingEvent.location || '',
        description: editingEvent.description || '',
        confidence: editingEvent.confidence || 100
      };
      
      // Create the first message with event details using the same format as when creating events
      const eventData = {
        title: editingEvent.title,
        startTime: editingEvent.start_time,
        endTime: editingEvent.end_time,
        description: editingEvent.description || '',
        location: editingEvent.location || '',
        confidence: editingEvent.confidence || 100
      };
      
      conversation = [
        {
          role: 'assistant',
          content: `I'm helping you edit "${editingEvent.title}". What would you like to change?`,
          timestamp: new Date(),
          eventData
        }
      ];
      
      showPreview = true;
      isComplete = true;
    }
    
    // Focus input after a short delay
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
    }, 100);

    // Handle URL parameters for Siri integration (only if not in edit mode)
    handleURLParameters();

    // Return cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  });

  // Get user's timezone and working hours
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const workingHours = {
    start: '09:00',
    end: '17:00'
  };

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    inputText = '';
    loading = true;
    lastUserMessage = userMessage;

    // Add user message to conversation
    conversation = [...conversation, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }];

    // Set timeout
    timeoutId = setTimeout(() => {
      if (loading) {
        handleTimeout();
      }
    }, TIMEOUT_DURATION);

    try {
      await processAIRequest(userMessage);
    } catch (error) {
      console.error('AI processing error:', error);
      
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        conversation = [...conversation, {
          role: 'assistant',
          content: `I'm having trouble processing your request. Retrying... (attempt ${retryCount}/${MAX_RETRIES})`,
          timestamp: new Date()
        }];
        
        // Retry after a short delay
        setTimeout(async () => {
          try {
            await processAIRequest(lastUserMessage);
          } catch (retryError) {
            handleError(retryError);
          }
        }, 2000);
      } else {
        handleError(error);
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      loading = false;
      retryCount = 0;
    }
  }

  async function processAIRequest(userMessage: string) {
    // Prepare conversation history with proper structure
    const conversationHistory = conversation.slice(0, -1).map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));

    const functionParams = {
      body: {
        input: userMessage,
        context: {
          currentDate: new Date().toISOString(),
          timezone: userTimezone,
          workingHours,
          conversation: conversationHistory,
          eventData: currentEventData,
          eventsData: currentEventsData,
          isFollowUp: conversation.length > 1,
          isEditing: isEditing,
          editingEvent: editingEvent,
          previousEvents: [...(currentEventData ? [currentEventData] : []), ...currentEventsData]
        }
      }
    };

    const { data: functionData, error: functionError } = await supabase.functions.invoke(
      'calendar-ai',
      functionParams
    );

    if (functionError) {
      console.error('Edge function error:', functionError);
      throw new Error(`Failed to process request: ${functionError.message}`);
    }

    if (!functionData) {
      throw new Error('No response from AI service');
    }

    // Handle multiple events
    if (functionData.isMultipleEvents && functionData.events) {
      currentEventsData = functionData.events.map((event: any) => ({
        ...event,
        user_id: user.id
      }));
      
      if (functionData.questions && functionData.questions.length > 0) {
        // AI has questions
        conversation = [...conversation, {
          role: 'assistant',
          content: functionData.questions[0],
          timestamp: new Date()
        }];
      } else if (functionData.confidence >= 70) {
        // High confidence, show events in chat
        isComplete = true;
        
        conversation = [...conversation, {
          role: 'assistant',
          content: functionData.chatResponse,
          timestamp: new Date(),
          eventsData: functionData.events
        }];
      } else {
        // Lower confidence, ask for clarification
        conversation = [...conversation, {
          role: 'assistant',
          content: functionData.chatResponse || 'I need more details to schedule these events.',
          timestamp: new Date()
        }];
      }
    } else {
      // Handle single event (existing logic)
      // Update current event data
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
      } else if (functionData.confidence >= 70) {
        // High confidence, show event in chat
        isComplete = true;
        
        const eventData = {
          title: functionData.title,
          startTime: functionData.startTime,
          endTime: functionData.endTime,
          description: functionData.description,
          location: functionData.location,
          confidence: functionData.confidence
        };

        console.log('Event times received:', {
          startTime: functionData.startTime,
          endTime: functionData.endTime
        });
        
        conversation = [...conversation, {
          role: 'assistant',
          content: functionData.chatResponse,
          timestamp: new Date(),
          eventData
        }];
      } else {
        // Lower confidence, ask for clarification
        conversation = [...conversation, {
          role: 'assistant',
          content: functionData.chatResponse || 'I need more details to schedule this event.',
          timestamp: new Date()
        }];
      }
    }
  }

  function handleTimeout() {
    loading = false;
    retryCount = 0;
    
    conversation = [...conversation, {
      role: 'assistant',
      content: 'I\'m taking longer than expected to process your request. You can try again or rephrase your message.',
      timestamp: new Date()
    }];

    // Reset state on timeout
    currentEventData = null;
    isComplete = false;
  }

  function handleError(error: any) {
    console.error('AI processing error:', error);
    
    conversation = [...conversation, {
      role: 'assistant',
      content: 'I encountered an error processing your request. Please try again or rephrase your message.',
      timestamp: new Date()
    }];

    // Reset state on error
    currentEventData = null;
    isComplete = false;
  }

  function retryLastRequest() {
    if (lastUserMessage && !loading) {
      inputText = lastUserMessage;
      handleSubmit(new Event('submit'));
    }
  }

  async function confirmEvent() {
    if ((!currentEventData && currentEventsData.length === 0) || !isComplete) return;

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

      if (currentEventsData.length > 0) {
        // Handle multiple events
        const eventsToCreate = currentEventsData.map(event => ({
          title: event.title,
          start_time: event.startTime,
          end_time: event.endTime,
          description: event.description,
          location: event.location,
          user_id: user.id
        }));

        const { error } = await supabase
          .from('events')
          .insert(eventsToCreate);

        if (error) throw error;

        conversation = [...conversation, {
          role: 'assistant',
          content: `✅ Successfully created ${eventsToCreate.length} events! You can view them in your calendar.`,
          timestamp: new Date()
        }];

        // Reset the form
        resetForm();
        
        // Dispatch event to notify parent component (like Calendar) to refresh
        dispatch('eventCreated', { events: eventsToCreate });
        
        // Navigate back to calendar view
        dispatch('viewChange', { view: 'calendar' });
      } else if (currentEventData) {
        // Handle single event
        const eventData = {
          title: currentEventData.title,
          start_time: currentEventData.startTime,
          end_time: currentEventData.endTime,
          description: currentEventData.description,
          location: currentEventData.location,
          user_id: user.id
        };

        if (isEditing && editingEvent) {
          // Update existing event
          const { error } = await supabase
            .from('events')
            .update(eventData)
            .eq('id', editingEvent.id)
            .eq('user_id', user.id); // Ensure user can only edit their own events

          if (error) throw error;

          conversation = [...conversation, {
            role: 'assistant',
            content: '✅ Event updated successfully! You can view the changes in your calendar.',
            timestamp: new Date()
          }];
        } else {
          // Create new event
          const { error } = await supabase
            .from('events')
            .insert([eventData]);

          if (error) throw error;

          conversation = [...conversation, {
            role: 'assistant',
            content: '✅ Event created successfully! You can view it in your calendar.',
            timestamp: new Date()
          }];
        }

        // Reset the form
        resetForm();
        
        // Dispatch event to notify parent component (like Calendar) to refresh
        dispatch('eventCreated', { event: eventData });
        
        // Navigate back to calendar view
        dispatch('viewChange', { view: 'calendar' });
      }
      
    } catch (error) {
      console.error('Event save error:', error);
      conversation = [...conversation, {
        role: 'assistant',
        content: `❌ Failed to ${isEditing ? 'update' : 'create'} event(s). Please try again.`,
        timestamp: new Date()
      }];
    } finally {
      loading = false;
    }
  }

  async function deleteEvent() {
    if (!editingEvent || !isEditing) return;
    
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    loading = true;
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', editingEvent.id)
        .eq('user_id', user.id); // Ensure user can only delete their own events

      if (error) throw error;

      conversation = [...conversation, {
        role: 'assistant',
        content: '🗑️ Event deleted successfully!',
        timestamp: new Date()
      }];

      // Dispatch event to notify parent component (like Calendar) to refresh
      dispatch('eventDeleted', { eventId: editingEvent.id });
      
      // Navigate back to calendar view
      dispatch('viewChange', { view: 'calendar' });
      
    } catch (error) {
      console.error('Event delete error:', error);
      conversation = [...conversation, {
        role: 'assistant',
        content: '❌ Failed to delete event. Please try again.',
        timestamp: new Date()
      }];
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    inputText = '';
    if (isEditing && editingEvent) {
      // Reset to original event data
      const eventData = {
        title: editingEvent.title,
        startTime: editingEvent.start_time,
        endTime: editingEvent.end_time,
        description: editingEvent.description || '',
        location: editingEvent.location || '',
        confidence: editingEvent.confidence || 100
      };
      
      conversation = [
        {
          role: 'assistant',
          content: `I'm helping you edit "${editingEvent.title}". What would you like to change?`,
          timestamp: new Date(),
          eventData
        }
      ];
      
      currentEventData = {
        title: editingEvent.title,
        startTime: editingEvent.start_time,
        endTime: editingEvent.end_time,
        location: editingEvent.location || '',
        description: editingEvent.description || '',
        confidence: editingEvent.confidence || 100
      };
      
      showPreview = true;
      isComplete = true;
    } else {
      // Complete reset for new events
      conversation = [];
      currentEventData = null;
      currentEventsData = [];
      showPreview = false;
      isComplete = false;
    }
  }

  function useExample(example: string) {
    inputText = example;
  }

  function formatDateTime(dateString: string) {
    if (!dateString) return '';
    
    console.log('Formatting:', dateString);
    const date = new Date(dateString);
    console.log('Date object:', date.toString());
    
    const result = date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    console.log('Formatted result:', result);
    return result;
  }

  function handleURLParameters() {
    // Skip if we're already in edit mode
    if (isEditing) {
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const eventText = urlParams.get('event');
    
    if (eventText) {
      // Pre-fill the input with the event text from Siri
      inputText = decodeURIComponent(eventText);
      
      // Automatically submit after a short delay
      setTimeout(() => {
        handleSubmit(new Event('submit'));
      }, 500);
    }
  }
</script>

<div class="space-y-6 px-2 pt-6">
  <div class="max-w-4xl mx-auto">
    <div class="relative">
      <Button
        variant="ghost"
        size="icon"
        class="absolute -right-2 -top-2 rounded-full z-10"
        onclick={() => dispatch('viewChange', { view: 'calendar' })}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </Button>
      <Card class="h-[calc(100vh-12rem)] flex flex-col">
        <CardContent class="flex-1 p-0 flex flex-col overflow-hidden">
          <!-- Chat Messages -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            {#if conversation.length === 0}
              <div class="flex items-start space-x-3">
                <div class="flex-1">
                  <div class="bg-muted rounded-xl p-4">
                    <p class="text-foreground">
                      {isEditing ? `I'm helping you edit "${editingEvent?.title}". What would you like to change?` : "Tell me about the event you'd like to schedule."}
                    </p>
                  </div>
                </div>
              </div>
            {/if}

            {#each conversation as message, index}
              <div class="flex items-start space-x-3 {message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}">
                <div class="w-8 h-8 {message.role === 'user' ? 'bg-muted' : 'bg-primary'} rounded-full flex-shrink-0 flex items-center justify-center">
                  {#if message.role === 'user'}
                    <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  {:else}
                    <svg class="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="bg-{message.role === 'user' ? 'muted' : 'muted'} rounded-xl p-4 break-words">
                    <p class="text-foreground">{message.content}</p>
                    
                    {#if message.role === 'assistant' && message.eventData && message.eventData.confidence >= 70}
                      <div class="mt-4 border-t pt-4">
                        <div class="space-y-2">
                          <p class="font-medium">{message.eventData.title}</p>
                          <p class="text-sm text-muted-foreground">
                            {formatDateTime(message.eventData.startTime)}
                            {#if message.eventData.endTime}
                              - {formatDateTime(message.eventData.endTime)}
                            {/if}
                          </p>
                          {#if message.eventData.location}
                            <p class="text-sm">📍 {message.eventData.location}</p>
                          {/if}
                          {#if message.eventData.description}
                            <p class="text-sm text-muted-foreground">{message.eventData.description}</p>
                          {/if}
                        </div>
                        {#if !(isEditing && index === 0)}
                          <div class="mt-4 flex space-x-2">
                            <Button
                              size="sm"
                              onclick={() => confirmEvent()}
                              disabled={loading}
                            >
                              {isEditing ? 'Update Event' : 'Create Event'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onclick={() => resetForm()}
                            >
                              Start Over
                            </Button>
                          </div>
                        {/if}
                        {#if isEditing && index === 0}
                          <div class="mt-4 flex space-x-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onclick={() => deleteEvent()}
                              disabled={loading}
                            >
                              Delete Event
                            </Button>
                          </div>
                        {/if}
                      </div>
                    {/if}
                    
                    {#if message.role === 'assistant' && message.eventsData && message.eventsData.length > 0}
                      <div class="mt-4 border-t pt-4">
                        <div class="space-y-4">
                          {#each message.eventsData as event, eventIndex}
                            <div class="border rounded-lg p-3 bg-background">
                              <div class="space-y-2">
                                <p class="font-medium">{event.title}</p>
                                <p class="text-sm text-muted-foreground">
                                  {formatDateTime(event.startTime)}
                                  {#if event.endTime}
                                    - {formatDateTime(event.endTime)}
                                  {/if}
                                </p>
                                {#if event.location}
                                  <p class="text-sm">📍 {event.location}</p>
                                {/if}
                                {#if event.description}
                                  <p class="text-sm text-muted-foreground">{event.description}</p>
                                {/if}
                              </div>
                            </div>
                          {/each}
                        </div>
                        <div class="mt-4 flex space-x-2">
                          <Button
                            size="sm"
                            onclick={() => confirmEvent()}
                            disabled={loading}
                          >
                            Create All Events
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onclick={() => resetForm()}
                          >
                            Start Over
                          </Button>
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}

            {#if loading}
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-primary rounded-full flex-shrink-0 flex items-center justify-center">
                  <div class="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div class="flex-1">
                  <div class="bg-muted rounded-xl p-4">
                    <p class="text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              </div>
            {/if}

            {#if !loading && lastUserMessage && conversation.length > 0 && conversation[conversation.length - 1] && conversation[conversation.length - 1].role === 'assistant' && (conversation[conversation.length - 1].content.includes('error') || conversation[conversation.length - 1].content.includes('longer than expected'))}
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-muted rounded-full flex-shrink-0 flex items-center justify-center">
                  <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="bg-muted rounded-xl p-4">
                    <div class="flex items-center justify-between">
                      <p class="text-muted-foreground">Having trouble? You can retry your last request.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => retryLastRequest()}
                        disabled={loading}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Input Area -->
          <div class="p-4 border-t bg-background">
            <form onsubmit={handleSubmit} class="flex space-x-3">
              <Input
                bind:value={inputText}
                type="text"
                placeholder="Describe your event..."
                disabled={loading}
                class="flex-1"
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || loading}
              >
                Send
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</div> 