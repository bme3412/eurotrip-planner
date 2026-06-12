import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { listTripsForUser } from '@/lib/trips/tripsRepository';
import { runAgentTurn } from '@/lib/concierge/agentRuntime';
import { decideProposal } from '@/lib/concierge/proposalDecision';
import {
  verifyLinkToken,
  parseCallbackData,
  sendTelegramMessage,
  sendTypingAction,
  answerCallbackQuery,
} from '@/lib/concierge/telegram';

export const runtime = 'nodejs';
// Agent turns run inline (~5–25s); Telegram waits up to ~60s before retrying.
export const maxDuration = 60;

const LINK_FIRST =
  'This chat isn’t linked yet. Open your trip on EuroTrip → Trip Home → Connect Telegram, and tap the link it gives you.';

/** The trip Olivier answers for: active today, else the most recent. */
async function resolveTrip(prefs) {
  const trips = await listTripsForUser({ userId: prefs.user_id, userEmail: prefs.user_email });
  if (!trips.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  const active = trips.find(
    (t) => t.status === 'active' && (!t.start_date || t.start_date <= today) && (!t.end_date || t.end_date >= today)
  );
  return active || trips[0];
}

async function prefsForChat(supabase, chatId) {
  const { data } = await supabase
    .from('concierge_preferences')
    .select('user_id, user_email, telegram_chat_id')
    .eq('telegram_chat_id', String(chatId))
    .maybeSingle();
  return data || null;
}

/** Telegram retries on slow/failed webhooks — drop updates we already hold. */
async function alreadyHandled(supabase, updateId) {
  if (!updateId) return false;
  const { data } = await supabase
    .from('concierge_messages')
    .select('id')
    .eq('meta->>tg_update_id', String(updateId))
    .limit(1);
  return !!data?.length;
}

/**
 * POST /api/telegram/webhook — the bot's single entry point.
 * Authenticated by Telegram's secret-token header (set via setWebhook;
 * scripts/telegram-setup.mjs). Handles: /start <code> account linking,
 * plain messages → one agent turn, and Apply/Skip callback buttons.
 */
export async function POST(request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let update = {};
  try { update = await request.json(); } catch { /* */ }
  const supabase = await getSupabaseAdmin();

  // ── Inline button taps (Apply / Skip) ──
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat?.id;
    const parsed = parseCallbackData(cq.data);
    if (!parsed || !chatId) {
      await answerCallbackQuery(cq.id, 'That button has expired.');
      return NextResponse.json({ ok: true });
    }
    const prefs = await prefsForChat(supabase, chatId);
    if (!prefs) {
      await answerCallbackQuery(cq.id, 'This chat isn’t linked.');
      return NextResponse.json({ ok: true });
    }
    const trip = await resolveTrip(prefs);
    if (!trip) {
      await answerCallbackQuery(cq.id, 'No trip found.');
      return NextResponse.json({ ok: true });
    }
    const result = await decideProposal(supabase, {
      tripId: trip.id,
      userId: prefs.user_id,
      userEmail: prefs.user_email,
      messageId: parsed.messageId,
      decision: parsed.decision,
    });
    if (result.ok && result.status === 'applied') {
      await answerCallbackQuery(cq.id, 'Applied ✓');
      await sendTelegramMessage(chatId, `Done — ${result.summary}.`);
    } else if (result.ok) {
      await answerCallbackQuery(cq.id, result.status === 'skipped' ? 'Skipped' : `Already ${result.status}`);
    } else {
      await answerCallbackQuery(cq.id, result.error || 'Couldn’t apply.');
    }
    return NextResponse.json({ ok: true });
  }

  // ── Plain messages ──
  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
  if (!chatId || !text) return NextResponse.json({ ok: true });

  // /start <code> — account linking via the signed deep-link payload.
  if (text.startsWith('/start')) {
    const token = text.split(/\s+/)[1] || '';
    const userId = verifyLinkToken(token);
    if (!userId) {
      await sendTelegramMessage(chatId, `Bonjour — I’m Olivier. ${LINK_FIRST}`);
      return NextResponse.json({ ok: true });
    }
    const { error } = await supabase
      .from('concierge_preferences')
      .upsert(
        { user_id: userId, telegram_chat_id: String(chatId), telegram_linked_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) {
      console.error('[telegram/webhook] link failed:', error.message);
      await sendTelegramMessage(chatId, 'Linking failed — try the Connect button again.');
    } else {
      await sendTelegramMessage(
        chatId,
        'Connected. Your briefs land here from now on, and you can just text me — “what’s tomorrow look like?”, “push the Louvre to 11”, that sort of thing.'
      );
    }
    return NextResponse.json({ ok: true });
  }

  const prefs = await prefsForChat(supabase, chatId);
  if (!prefs) {
    await sendTelegramMessage(chatId, LINK_FIRST);
    return NextResponse.json({ ok: true });
  }

  if (await alreadyHandled(supabase, update.update_id)) {
    return NextResponse.json({ ok: true });
  }

  const trip = await resolveTrip(prefs);
  if (!trip) {
    await sendTelegramMessage(chatId, 'No trips on file yet — plan one on EuroTrip and I’ll take it from there.');
    return NextResponse.json({ ok: true });
  }

  await sendTypingAction(chatId);
  const result = await runAgentTurn({
    supabase,
    trip,
    userId: prefs.user_id,
    userEmail: prefs.user_email,
    message: text.slice(0, 1500),
    channel: 'telegram',
    userMeta: { tg_update_id: String(update.update_id || '') },
  });

  if (result.error) {
    await sendTelegramMessage(chatId, 'I’m having trouble right now — try me again in a moment.');
  } else {
    await sendTelegramMessage(chatId, result.text, result.proposal ? { proposalMessageId: result.messageId } : {});
  }
  return NextResponse.json({ ok: true });
}
