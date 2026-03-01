/**
 * Lambda: Nightly Briefing Orchestrator
 *
 * Triggered by EventBridge cron. For each active trip with activities
 * tomorrow, invokes the briefing Bedrock Agent and sends an email
 * with the resulting briefing.
 *
 * Flow:
 *  1. Query Supabase for trips where tomorrow is a trip day
 *  2. For each trip, invoke the briefing agent with tomorrow's itinerary
 *  3. Send the briefing email via Resend
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *       BEDROCK_BRIEFING_AGENT_ID, BEDROCK_BRIEFING_AGENT_ALIAS_ID,
 *       RESEND_API_KEY, FROM_EMAIL
 */

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BRIEFING_AGENT_ID = process.env.BEDROCK_BRIEFING_AGENT_ID;
const BRIEFING_ALIAS_ID = process.env.BEDROCK_BRIEFING_AGENT_ALIAS_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'briefing@eurotrip-planner.com';

const bedrockClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

async function supabaseFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path}: ${res.status}`);
  return res.json();
}

async function getTripsWithTomorrow() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const trips = await supabaseFetch(
    `trips?status=eq.active&start_date=lte.${tomorrow}&end_date=gte.${tomorrow}&select=*`
  );

  const results = [];
  for (const trip of trips) {
    const days = await supabaseFetch(
      `trip_days?trip_id=eq.${trip.id}&date=eq.${tomorrow}&select=*`
    );

    if (!days.length) continue;

    const dayIds = days.map((d) => d.id);
    const activities = await supabaseFetch(
      `trip_activities?trip_day_id=in.(${dayIds.join(',')})&status=eq.planned&order=sort_order.asc&select=*`
    );

    results.push({
      trip,
      date: tomorrow,
      dayNumber: days[0].day_number,
      activities,
    });
  }

  return results;
}

function buildBriefingPrompt(tripData) {
  const { trip, date, dayNumber, activities } = tripData;
  const activityList = activities
    .map((a) => `  - ${a.time_block}: ${a.name} (${a.type || 'activity'})${a.indoor ? ' [indoor]' : ' [outdoor]'}`)
    .join('\n');

  return `Please create a morning briefing for this trip day.

TRIP: ${trip.city} trip
DATE: ${date} (Day ${dayNumber})
ACTIVITIES:
${activityList}

Check the weather for ${trip.city} on ${date}. If weather is bad for outdoor activities, suggest indoor alternatives. Check if any places might be closed. Provide practical tips.

Format as a structured briefing with sections: Tomorrow's Plan, Weather, Alerts (if any), Tips.`;
}

async function invokeBriefingAgent(prompt, tripId) {
  const sessionId = `briefing-${tripId}-${Date.now()}`;

  const command = new InvokeAgentCommand({
    agentId: BRIEFING_AGENT_ID,
    agentAliasId: BRIEFING_ALIAS_ID,
    sessionId,
    inputText: prompt,
    enableTrace: false,
  });

  const response = await bedrockClient.send(command);
  let text = '';

  for await (const event of response.completion || []) {
    if (event.chunk?.bytes) {
      text += new TextDecoder().decode(event.chunk.bytes);
    }
  }

  return text;
}

function buildEmailHtml(briefingText, trip, date) {
  const sections = briefingText.split(/\n(?=#{1,3}\s|\*\*)/);
  const formattedSections = sections
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `<p style="margin: 0 0 12px; line-height: 1.6;">${s.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #111113; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="color: #c9963c; font-size: 24px;">✦</span>
      <h1 style="color: #fff; font-size: 20px; margin: 8px 0 4px;">Your ${trip.city} Briefing</h1>
      <p style="color: #888; font-size: 14px; margin: 0;">${date}</p>
    </div>
    <div style="background: #1c1c1f; border: 1px solid #333; border-radius: 12px; padding: 24px; color: #e4e4e7; font-size: 14px;">
      ${formattedSections}
    </div>
    <p style="text-align: center; color: #555; font-size: 11px; margin-top: 24px;">
      EuroTrip Planner · AI-powered daily briefing
    </p>
  </div>
</body>
</html>`;
}

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.log('[briefing] No RESEND_API_KEY — skipping email send');
    console.log('[briefing] Would send to:', to, '| Subject:', subject);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.log('[briefing] Email sent:', data.id);
}

export async function handler(event) {
  console.log('[briefing] Starting nightly briefing run');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[briefing] Missing Supabase credentials');
    return { statusCode: 500, body: 'Missing Supabase config' };
  }

  if (!BRIEFING_AGENT_ID || !BRIEFING_ALIAS_ID) {
    console.error('[briefing] Missing Bedrock briefing agent config');
    return { statusCode: 500, body: 'Missing briefing agent config' };
  }

  try {
    const tripsWithTomorrow = await getTripsWithTomorrow();
    console.log(`[briefing] Found ${tripsWithTomorrow.length} trips with activities tomorrow`);

    const results = [];
    for (const tripData of tripsWithTomorrow) {
      try {
        const prompt = buildBriefingPrompt(tripData);
        const briefingText = await invokeBriefingAgent(prompt, tripData.trip.id);
        const emailHtml = buildEmailHtml(briefingText, tripData.trip, tripData.date);

        const userEmail = tripData.trip.user_email || tripData.trip.email;
        if (userEmail) {
          const city = tripData.trip.city || 'your trip';
          await sendEmail(
            userEmail,
            `☀️ ${city.charAt(0).toUpperCase() + city.slice(1)} Day ${tripData.dayNumber} Briefing`,
            emailHtml
          );
        }

        results.push({ tripId: tripData.trip.id, status: 'sent' });
      } catch (err) {
        console.error(`[briefing] Failed for trip ${tripData.trip.id}:`, err);
        results.push({ tripId: tripData.trip.id, status: 'error', error: err.message });
      }
    }

    console.log('[briefing] Run complete:', JSON.stringify(results));
    return { statusCode: 200, body: JSON.stringify({ processed: results.length, results }) };
  } catch (err) {
    console.error('[briefing] Fatal error:', err);
    return { statusCode: 500, body: err.message };
  }
}
