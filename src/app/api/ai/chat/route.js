import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const result = await streamText({
      model: google('gemini-1.5-flash'),
      messages,
      temperature: 0.6,
      system:
        'You are Eurotrip Copilot, a concise, helpful travel planner. Focus on European city trips. When relevant, suggest cities, neighborhoods, key attractions, and travel tips. Keep answers short, skimmable, and actionable.',
    });

    return result.toDataStreamResponse();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Chat error', message: error?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


