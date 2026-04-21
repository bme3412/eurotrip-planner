'use client';

import { useAgentContext } from '@/hooks/useAgentContext';
import AgentSidecar from './AgentSidecar';

/**
 * Context-specific starter prompts
 */
const STARTER_PROMPTS = {
  'city-guide': [
    'What are the must-see attractions?',
    'Best time to visit this city?',
    'Where should I stay?',
  ],
  'city-guides-index': [
    'Which cities are best for foodies?',
    'Best cities for a first trip to Europe?',
    'Compare Paris and Barcelona',
  ],
  explore: [
    'Help me find cities for my dates',
    'Which cities are underrated?',
    'Best route for 2 weeks in Europe?',
  ],
  discover: [
    'Best cities for art lovers?',
    'Where should I go in summer?',
    'Budget-friendly destinations?',
  ],
  itinerary: [
    'Suggest an improvement for this trip',
    'Is this itinerary too packed?',
    'Add a restaurant recommendation',
  ],
  home: [
    'Help me plan a trip to Europe',
    'Best cities to visit in spring?',
    'I have 10 days, where should I go?',
  ],
  other: [
    'Help me plan a trip',
    'Tell me about European cities',
    'Best destinations this month?',
  ],
};

/**
 * AgentProvider - Global wrapper that provides context-aware AgentSidecar
 *
 * Mounted in layout.js to appear on all pages (except hidden routes)
 */
export default function AgentProvider() {
  const context = useAgentContext();

  const starterPrompts = STARTER_PROMPTS[context.page] || STARTER_PROMPTS.other;

  return (
    <AgentSidecar
      context={context}
      agentUrl="/api/conversation"
      starterPrompts={starterPrompts}
    />
  );
}
