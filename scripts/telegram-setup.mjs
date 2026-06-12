#!/usr/bin/env node
/**
 * One-time Telegram bot wiring.
 *
 * Prereqs: create a bot with @BotFather (/newbot), put TELEGRAM_BOT_TOKEN and
 * TELEGRAM_WEBHOOK_SECRET (any random string) in your env, then:
 *
 *   node --env-file=.env.local scripts/telegram-setup.mjs https://<your-domain>
 *   node --env-file=.env.local scripts/telegram-setup.mjs --status
 *
 * Registers <domain>/api/telegram/webhook with the secret token and prints
 * the bot username (set it as TELEGRAM_BOT_USERNAME).
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN — run with --env-file=.env.local');
  process.exit(1);
}

const api = (method, payload) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  }).then((r) => r.json());

const arg = process.argv[2];

const me = await api('getMe');
if (!me.ok) {
  console.error('getMe failed — bad token?', me.description);
  process.exit(1);
}
console.log(`Bot: @${me.result.username}  →  set TELEGRAM_BOT_USERNAME=${me.result.username}`);

if (arg === '--status' || !arg) {
  const info = await api('getWebhookInfo');
  console.log('Webhook:', info.result?.url || '(not set)');
  if (info.result?.last_error_message) console.log('Last error:', info.result.last_error_message);
  if (!arg) console.log('\nTo register: node --env-file=.env.local scripts/telegram-setup.mjs https://<your-domain>');
  process.exit(0);
}

if (!secret) {
  console.error('Missing TELEGRAM_WEBHOOK_SECRET — set any random string first.');
  process.exit(1);
}
const url = `${arg.replace(/\/$/, '')}/api/telegram/webhook`;
const res = await api('setWebhook', {
  url,
  secret_token: secret,
  allowed_updates: ['message', 'callback_query'],
});
console.log(res.ok ? `✓ webhook set: ${url}` : `✗ setWebhook failed: ${res.description}`);
