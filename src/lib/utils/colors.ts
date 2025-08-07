// Color scheme based on the image
export const EVENT_COLORS = {
  yellow: {
    name: 'Yellow',
    concepts: ['Energy', 'Joy', 'Warmth'],
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200',
    badge: 'bg-yellow-500 text-white'
  },
  orange: {
    name: 'Orange',
    concepts: ['Creativity', 'Enthusiasm', 'Excitement'],
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-200',
    badge: 'bg-orange-500 text-white'
  },
  blue: {
    name: 'Blue',
    concepts: ['Calm', 'Patience', 'Security'],
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200',
    badge: 'bg-blue-500 text-white'
  },
  purple: {
    name: 'Purple',
    concepts: ['Ambition', 'Wisdom', 'Power'],
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-800',
    hover: 'hover:bg-purple-200',
    badge: 'bg-purple-500 text-white'
  },
  green: {
    name: 'Green',
    concepts: ['Growth', 'Healing', 'Balance'],
    bg: 'bg-green-100',
    border: 'border-green-300',
    text: 'text-green-800',
    hover: 'hover:bg-green-200',
    badge: 'bg-green-500 text-white'
  },
  red: {
    name: 'Red',
    concepts: ['Action', 'Attention', 'Determination'],
    bg: 'bg-red-100',
    border: 'border-red-300',
    text: 'text-red-800',
    hover: 'hover:bg-red-200',
    badge: 'bg-red-500 text-white'
  },
  black: {
    name: 'Black',
    concepts: ['Formality', 'Mystery', 'Sophistication'],
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-800',
    hover: 'hover:bg-gray-200',
    badge: 'bg-gray-500 text-white'
  },
  pink: {
    name: 'Pink',
    concepts: ['Kindness', 'Sensitivity', 'Optimism'],
    bg: 'bg-pink-100',
    border: 'border-pink-300',
    text: 'text-pink-800',
    hover: 'hover:bg-pink-200',
    badge: 'bg-pink-500 text-white'
  }
} as const;

export type EventColor = keyof typeof EVENT_COLORS;

export function getEventColorClasses(color: EventColor) {
  const colorConfig = EVENT_COLORS[color];
  return {
    bg: colorConfig.bg,
    border: colorConfig.border,
    text: colorConfig.text,
    hover: colorConfig.hover,
    badge: colorConfig.badge
  };
}

export function getEventColorName(color: EventColor): string {
  return EVENT_COLORS[color].name;
}

export function getEventColorConcepts(color: EventColor): string[] {
  return EVENT_COLORS[color].concepts;
}

// Function to suggest a color based on event title/content
export function suggestEventColor(title: string, description?: string): EventColor {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Keywords for each color
  const colorKeywords = {
    yellow: ['energy', 'joy', 'warm', 'happy', 'fun', 'party', 'celebration', 'birthday'],
    orange: ['creative', 'enthusiasm', 'excitement', 'innovation', 'brainstorm', 'workshop', 'meeting'],
    blue: ['calm', 'patience', 'security', 'meeting', 'appointment', 'consultation', 'therapy'],
    purple: ['ambition', 'wisdom', 'power', 'leadership', 'strategy', 'planning', 'executive'],
    green: ['growth', 'healing', 'balance', 'health', 'wellness', 'exercise', 'nature', 'outdoor'],
    red: ['action', 'attention', 'determination', 'urgent', 'deadline', 'important', 'critical'],
    black: ['formality', 'mystery', 'sophistication', 'formal', 'business', 'interview', 'presentation'],
    pink: ['kindness', 'sensitivity', 'optimism', 'romantic', 'date', 'love', 'care', 'support']
  };
  
  // Count matches for each color
  const scores: Record<EventColor, number> = {
    yellow: 0, orange: 0, blue: 0, purple: 0, green: 0, red: 0, black: 0, pink: 0
  };
  
  for (const [color, keywords] of Object.entries(colorKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[color as EventColor]++;
      }
    }
  }
  
  // Find the color with the highest score
  const maxScore = Math.max(...Object.values(scores));
  const suggestedColors = Object.entries(scores)
    .filter(([_, score]) => score === maxScore)
    .map(([color]) => color as EventColor);
  
  // Return the first color with the highest score, or default to blue
  return suggestedColors.length > 0 ? suggestedColors[0] : 'blue';
}
