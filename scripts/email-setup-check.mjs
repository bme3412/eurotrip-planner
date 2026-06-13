/**
 * Email-channel setup checker — run after each setup step to see what's live.
 *
 *   node --env-file=.env.local scripts/email-setup-check.mjs [--send you@example.com]
 *
 * Checks: env vars → DNS records (MX/SPF/DKIM) → Resend API key validity →
 * inbound webhook route reachability. With --send, fires a real test email
 * through the same Resend path the concierge uses (verifies FROM_EMAIL +
 * domain verification end-to-end; check the inbox AND that Reply-To points
 * at CONCIERGE_INBOUND_EMAIL).
 */

import { promises as dns } from 'node:dns';

const args = process.argv.slice(2);
const sendTo = args.includes('--send') ? args[args.indexOf('--send') + 1] : null;

const ok = (s) => console.log(`  ✓ ${s}`);
const bad = (s) => console.log(`  ✗ ${s}`);
const info = (s) => console.log(`  · ${s}`);

function domainOf(addr) {
  const m = String(addr || '').match(/@([^>\s]+)/);
  return m ? m[1].replace(/>$/, '') : null;
}

console.log('\n— Env vars —');
const env = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  FROM_EMAIL: process.env.FROM_EMAIL,
  CONCIERGE_INBOUND_EMAIL: process.env.CONCIERGE_INBOUND_EMAIL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
};
for (const [k, v] of Object.entries(env)) {
  if (v) ok(`${k} set${k === 'FROM_EMAIL' || k === 'CONCIERGE_INBOUND_EMAIL' ? ` (${v})` : ''}`);
  else bad(`${k} missing`);
}

const sendDomain = domainOf(env.FROM_EMAIL);
const inboundDomain = domainOf(env.CONCIERGE_INBOUND_EMAIL);

console.log('\n— DNS —');
if (!sendDomain) {
  bad('FROM_EMAIL has no domain to check');
} else {
  // DKIM
  try {
    const txt = await dns.resolveTxt(`resend._domainkey.${sendDomain}`);
    const flat = txt.map((r) => r.join('')).join(' ');
    if (flat.includes('p=')) ok(`DKIM record on resend._domainkey.${sendDomain}`);
    else bad(`resend._domainkey.${sendDomain} exists but no p= key`);
  } catch {
    bad(`DKIM missing: TXT resend._domainkey.${sendDomain} (not propagated yet?)`);
  }
  // SPF on send subdomain
  try {
    const txt = await dns.resolveTxt(`send.${sendDomain}`);
    const flat = txt.map((r) => r.join('')).join(' ');
    if (flat.includes('v=spf1')) ok(`SPF record on send.${sendDomain}`);
    else bad(`send.${sendDomain} TXT exists but no v=spf1`);
  } catch {
    bad(`SPF missing: TXT send.${sendDomain}`);
  }
  // Send MX
  try {
    const mx = await dns.resolveMx(`send.${sendDomain}`);
    if (mx.length) ok(`Send MX on send.${sendDomain} → ${mx[0].exchange}`);
  } catch {
    bad(`Send MX missing on send.${sendDomain}`);
  }
}
if (inboundDomain) {
  try {
    const mx = await dns.resolveMx(inboundDomain);
    const inboundMx = mx.find((r) => /resend|amazonaws|aws/i.test(r.exchange));
    if (inboundMx) ok(`Receiving MX on ${inboundDomain} → ${inboundMx.exchange} (prio ${inboundMx.priority})`);
    else if (mx.length) bad(`${inboundDomain} has MX (${mx[0].exchange}) but it doesn't look like Resend's`);
    else bad(`No MX on ${inboundDomain}`);
  } catch {
    bad(`Receiving MX missing on ${inboundDomain}`);
  }
}

console.log('\n— Resend API —');
if (!env.RESEND_API_KEY) {
  bad('skipped (no key)');
} else {
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    if (!res.ok) {
      bad(`API key rejected (${res.status})`);
    } else {
      const { data } = await res.json();
      ok('API key valid');
      for (const d of data || []) {
        info(`domain ${d.name}: ${d.status}`);
      }
      if (sendDomain && !(data || []).some((d) => d.name === sendDomain && d.status === 'verified')) {
        bad(`${sendDomain} is not "verified" yet in Resend`);
      }
    }
  } catch (err) {
    bad(`API unreachable: ${err.message}`);
  }
}

console.log('\n— Inbound webhook route —');
if (!env.NEXT_PUBLIC_SITE_URL) {
  bad('skipped (no NEXT_PUBLIC_SITE_URL)');
} else {
  const url = `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/api/concierge/email/inbound`;
  try {
    const res = await fetch(url, { method: 'POST', body: '{}' });
    if (res.status === 401) ok(`route live + secret configured (401 on unsigned POST) — ${url}`);
    else if (res.status === 503) bad(`route live but RESEND_WEBHOOK_SECRET not set on that deployment — ${url}`);
    else bad(`unexpected ${res.status} from ${url}`);
  } catch (err) {
    bad(`unreachable: ${url} (${err.message})`);
  }
}

if (sendTo) {
  console.log(`\n— Test send to ${sendTo} —`);
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    bad('needs RESEND_API_KEY + FROM_EMAIL');
  } else {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [sendTo],
        subject: 'Olivier email channel — test',
        html: '<p>Outbound works. Now <strong>reply to this email</strong> — if inbound is wired, Olivier answers.</p>',
        ...(env.CONCIERGE_INBOUND_EMAIL ? { reply_to: [env.CONCIERGE_INBOUND_EMAIL] } : {}),
      }),
    });
    if (res.ok) ok(`sent — check the inbox (and that Reply-To = ${env.CONCIERGE_INBOUND_EMAIL || 'unset!'})`);
    else bad(`send failed (${res.status}): ${await res.text()}`);
  }
}

console.log('');
