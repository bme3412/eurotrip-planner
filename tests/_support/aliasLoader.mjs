/**
 * Node ESM import hook that rewrites the "@/" alias to an absolute URL under
 * ./src. Mirrors the Next.js jsconfig.json path mapping so tests can exercise
 * modules that use the alias without pulling in Next or Webpack.
 *
 * Usage: `node --import ./tests/_support/register.mjs --test tests/*.test.mjs`
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as pathResolve, extname } from 'node:path';
import { statSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = pathResolve(here, '..', '..', 'src');
const srcUrl = pathToFileURL(SRC_ROOT).href;

function ensureExtension(urlString) {
  // URL might point to /path/to/module (no extension). Next.js allows this
  // but raw Node ESM resolution does not unless it's a .js file or a
  // directory with package.json "main". Try common extensions.
  const withoutHash = urlString.split('#')[0].split('?')[0];
  const fsPath = fileURLToPath(withoutHash);
  if (extname(fsPath)) return urlString;

  // Prefer .js, then .mjs, then index.js, then directory.
  for (const candidate of [`${fsPath}.js`, `${fsPath}.mjs`]) {
    try {
      if (statSync(candidate).isFile()) {
        return pathToFileURL(candidate).href;
      }
    } catch {}
  }
  try {
    if (statSync(fsPath).isDirectory()) {
      for (const idx of [`${fsPath}/index.js`, `${fsPath}/index.mjs`]) {
        try {
          if (statSync(idx).isFile()) {
            return pathToFileURL(idx).href;
          }
        } catch {}
      }
    }
  } catch {}
  return urlString;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const rewritten = ensureExtension(`${srcUrl}/${specifier.slice(2)}`);
    return nextResolve(rewritten, context);
  }
  // Handle extensionless relative imports used by Next.js conventions
  // (e.g. `import foo from './bar'`).
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !extname(specifier)
  ) {
    try {
      return await nextResolve(specifier, context);
    } catch (err) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' && context?.parentURL) {
        const parentDir = dirname(fileURLToPath(context.parentURL));
        const absUrl = pathToFileURL(pathResolve(parentDir, specifier)).href;
        const fixed = ensureExtension(absUrl);
        if (fixed !== absUrl) return nextResolve(fixed, context);
      }
      throw err;
    }
  }
  return nextResolve(specifier, context);
}
