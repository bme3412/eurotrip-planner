/**
 * Tiny CLI argument parser tailored for the content build/refresh scripts.
 *
 * Supported syntax:
 *   --flag                  -> { flag: true }
 *   --key value             -> { key: 'value' }
 *   --key=value             -> { key: 'value' }
 *   positional words        -> args[]
 *
 * Does not depend on any external package.
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    if (eq !== -1) {
      const key = token.slice(2, eq);
      out[key] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

/**
 * Lightweight logger with optional verbose mode and tagged categories.
 */
export function makeLogger({ verbose = false, quiet = false } = {}) {
  const log = (level, ...args) => {
    if (quiet && level !== 'error') return;
    if (level === 'debug' && !verbose) return;
    const prefix =
      level === 'error' ? '✗'
      : level === 'warn' ? '!'
      : level === 'ok' ? '✓'
      : level === 'debug' ? '·'
      : '→';
    // eslint-disable-next-line no-console
    console.log(prefix, ...args);
  };
  return {
    info: (...a) => log('info', ...a),
    ok: (...a) => log('ok', ...a),
    warn: (...a) => log('warn', ...a),
    error: (...a) => log('error', ...a),
    debug: (...a) => log('debug', ...a),
  };
}
