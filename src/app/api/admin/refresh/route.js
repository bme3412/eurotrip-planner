/**
 * POST /api/admin/refresh
 *
 * Dev-only endpoint that shells out to `scripts/refresh/index.mjs`. Returns
 * the CLI's stdout/stderr alongside an `ok` flag the admin UI uses to
 * render success/failure.
 *
 * Refuses to run in production (responds 404) so it cannot accidentally be
 * exposed to a public deployment. Outside production it additionally requires
 * either a matching ADMIN_REFRESH_TOKEN bearer token or, when no token is
 * configured, a loopback Host — a dev server exposed on the LAN must not
 * accept unauthenticated requests that spawn child processes.
 */
import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPO_ROOT = resolve(process.cwd());
const ALLOWED_SECTIONS = new Set(['overview', 'connections']);
const SLUG_RE = /^[a-z][a-z0-9-]{0,62}$/;

function runCli(args, timeoutMs = 120_000) {
  return new Promise((resolveProm) => {
    const proc = spawn(process.execPath, ['scripts/refresh/index.mjs', ...args], {
      cwd: REPO_ROOT,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => proc.kill('SIGKILL'), timeoutMs);
    proc.stdout.on('data', (b) => { stdout += b.toString(); });
    proc.stderr.on('data', (b) => { stderr += b.toString(); });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      resolveProm({ code, stdout, stderr });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      resolveProm({ code: -1, stdout, stderr: stderr + err.message });
    });
  });
}

function isAuthorized(request) {
  const configured = process.env.ADMIN_REFRESH_TOKEN || '';
  if (configured) {
    const header = request.headers.get('authorization') || '';
    const supplied = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
    const a = Buffer.from(supplied);
    const b = Buffer.from(configured);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const host = (request.headers.get('host') || '').split(':')[0];
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON body' }, { status: 400 });
  }

  const city = String(body?.city || '').trim().toLowerCase();
  const section = String(body?.section || '').trim();

  // Strict validation — the values flow into a child process argv list. Even
  // though spawn() with an array avoids shell-injection, we still reject
  // anything that doesn't match the canonical slug/section format.
  if (!SLUG_RE.test(city)) {
    return NextResponse.json({ ok: false, message: 'Invalid city slug' }, { status: 400 });
  }
  if (!ALLOWED_SECTIONS.has(section)) {
    return NextResponse.json({ ok: false, message: 'Section not in allowlist' }, { status: 400 });
  }

  const { code, stdout, stderr } = await runCli(['city', city, '--section', section]);

  return NextResponse.json({
    ok: code === 0,
    code,
    stdout,
    stderr,
    message: code === 0 ? `refreshed ${city}/${section}` : `cli exited ${code}`,
  });
}
