#!/usr/bin/env node
/**
 * Invite people off the travel-agent waitlist (closed beta).
 *
 * Sets invited_at on their concierge_waitlist row (creating one if they never
 * signed up — handy for friends & family), then sends the "you're in" email
 * via Resend (best-effort; skipped without RESEND_API_KEY).
 *
 * Usage:
 *   node --env-file=.env.local scripts/concierge-invite.mjs alice@example.com [bob@example.com ...]
 *   node --env-file=.env.local scripts/concierge-invite.mjs --list      # show the waitlist
 *
 * Against production, point the env file at your prod Supabase keys.
 */

import { createClient } from '@supabase/supabase-js';
import { sendInviteEmail } from '../src/lib/concierge/email.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env.local');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const args = process.argv.slice(2);

if (args.includes('--list')) {
  const { data, error } = await supabase
    .from('concierge_waitlist')
    .select('email, source, invited_at, created_at')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('List failed:', error.message);
    process.exit(1);
  }
  for (const row of data || []) {
    const status = row.invited_at ? `invited ${row.invited_at.slice(0, 10)}` : 'waiting';
    console.log(`${status.padEnd(20)} ${row.email}  (${row.source || '?'}, joined ${row.created_at.slice(0, 10)})`);
  }
  console.log(`\n${(data || []).length} total, ${(data || []).filter((r) => !r.invited_at).length} waiting`);
  process.exit(0);
}

const emails = args.filter((a) => a.includes('@')).map((e) => e.trim().toLowerCase());
if (!emails.length) {
  console.error('Usage: node --env-file=.env.local scripts/concierge-invite.mjs <email> [...] | --list');
  process.exit(1);
}

for (const email of emails) {
  const { error } = await supabase
    .from('concierge_waitlist')
    .upsert(
      { email, invited_at: new Date().toISOString(), updated_at: new Date().toISOString(), source: 'concierge-preview' },
      { onConflict: 'email' }
    );
  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    continue;
  }
  const mail = await sendInviteEmail({ to: email });
  console.log(`✓ invited ${email}${mail.sent ? ' (email sent)' : ` (email skipped: ${mail.skipped})`}`);
}
