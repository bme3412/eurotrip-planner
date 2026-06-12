// Telegram channel adapter (T4). The thread stays canonical — this module
// only mirrors messages out and carries replies in. Everything no-ops without
// TELEGRAM_BOT_TOKEN so the channel is purely additive.
//
// Pure helpers (link tokens, callback data) are separated from the Bot API
// calls for plain-Node tests.

import { createHmac, timingSafeEqual } from 'node:crypto';

const API_BASE = 'https://api.telegram.org';

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function linkSecret() {
  return process.env.CONCIERGE_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function telegramConfigured() {
  return !!botToken();
}

// ── Account-link tokens ──────────────────────────────────────────────────────
// t.me start payloads allow [A-Za-z0-9_-]{1,64}. UUID hex (32) + '_' + HMAC
// prefix (16) = 49 chars.

function sign(uuidHex, secret) {
  return createHmac('sha256', secret).update(`tg-link:${uuidHex}`).digest('hex').slice(0, 16);
}

/** userId (UUID) → signed start payload. Null without a secret. */
export function makeLinkToken(userId, secret = linkSecret()) {
  const hex = typeof userId === 'string' ? userId.replace(/-/g, '') : '';
  if (!/^[0-9a-f]{32}$/i.test(hex) || !secret) return null;
  return `${hex}_${sign(hex.toLowerCase(), secret)}`;
}

/** Start payload → userId (UUID) or null. */
export function verifyLinkToken(token, secret = linkSecret()) {
  const m = typeof token === 'string' ? token.match(/^([0-9a-f]{32})_([0-9a-f]{16})$/i) : null;
  if (!m || !secret) return null;
  const hex = m[1].toLowerCase();
  const expected = sign(hex, secret);
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(m[2].toLowerCase()))) return null;
  } catch {
    return null;
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Proposal callback data (≤64 bytes) ──────────────────────────────────────

export function makeCallbackData(decision, messageId) {
  return `p:${decision === 'apply' ? 'a' : 's'}:${messageId}`;
}

export function parseCallbackData(data) {
  const m = typeof data === 'string' ? data.match(/^p:(a|s):([0-9a-f-]{36})$/i) : null;
  if (!m) return null;
  return { decision: m[1] === 'a' ? 'apply' : 'skip', messageId: m[2] };
}

// ── Bot API calls (best-effort; no-op without a token) ──────────────────────

async function call(method, payload) {
  const token = botToken();
  if (!token) return { ok: false, skipped: 'no_token' };
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      console.error(`[concierge/telegram] ${method} failed:`, data.description || res.status);
      return { ok: false };
    }
    return { ok: true, result: data.result };
  } catch (err) {
    console.error(`[concierge/telegram] ${method} error:`, err?.message);
    return { ok: false };
  }
}

/**
 * Send a message; proposals ride along as inline Apply/Skip buttons.
 * @param {object} [opts] { proposalMessageId } — attach Apply/Skip for this thread message
 */
export async function sendTelegramMessage(chatId, text, opts = {}) {
  if (!chatId || !text) return { ok: false, skipped: 'no_target' };
  const payload = { chat_id: chatId, text: String(text).slice(0, 4000) };
  if (opts.proposalMessageId) {
    payload.reply_markup = {
      inline_keyboard: [
        [
          { text: '✓ Apply', callback_data: makeCallbackData('apply', opts.proposalMessageId) },
          { text: 'Skip', callback_data: makeCallbackData('skip', opts.proposalMessageId) },
        ],
      ],
    };
  }
  return call('sendMessage', payload);
}

export async function sendTypingAction(chatId) {
  if (!chatId) return { ok: false };
  return call('sendChatAction', { chat_id: chatId, action: 'typing' });
}

export async function answerCallbackQuery(callbackQueryId, text) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, text: String(text || '').slice(0, 190) });
}
