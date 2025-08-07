<script lang="ts">
  import { EVENT_COLORS, type EventColor } from '../../utils/colors';
  
  let { selectedColor = $bindable('blue' as EventColor), showLabels = false } = $props<{
    selectedColor?: EventColor;
    showLabels?: boolean;
  }>();
</script>

<div class="space-y-2">
  {#if showLabels}
    <p class="text-sm font-medium">Event Color:</p>
  {/if}
  
  <div class="flex flex-wrap gap-2">
    {#each Object.entries(EVENT_COLORS) as [colorKey, colorConfig]}
      <button
        type="button"
        class="w-8 h-8 rounded-full border-2 transition-all {colorConfig.bg} {colorConfig.border} {selectedColor === colorKey ? 'ring-2 ring-offset-2 ring-primary' : ''}"
        onclick={() => selectedColor = colorKey as EventColor}
        title="{colorConfig.name}: {colorConfig.concepts.join(', ')}"
      >
      </button>
    {/each}
  </div>
  
  {#if showLabels}
    <p class="text-xs text-muted-foreground">
      {EVENT_COLORS[selectedColor as EventColor].name}: {EVENT_COLORS[selectedColor as EventColor].concepts.join(', ')}
    </p>
  {/if}
</div>
