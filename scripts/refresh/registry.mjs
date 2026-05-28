/**
 * Section -> generator mapping for the refresh CLI.
 *
 * A "generator" is a module exposing:
 *   export const meta = { section, kind, source };
 *   export async function generate({ city, country, current, ctx }): Promise<unknown>
 *
 * `kind` is purely informational ('llm' | 'script') — the CLI calls each
 * generator the same way and lets it decide what side effects (LLM call,
 * Google Places fetch, etc.) it needs.
 *
 * Generators must return the new section payload (a plain JSON value). The
 * CLI is responsible for atomic write, _meta update, and downstream rebuild.
 */

export const REGISTRY = {
  overview: { module: './generators/overview.mjs', kind: 'llm', source: 'llm:claude-opus-4-5' },
  connections: { module: './generators/connections.mjs', kind: 'script', source: 'script:normalize' },
};

export function listSections() {
  return Object.keys(REGISTRY);
}

export function getGeneratorMeta(section) {
  return REGISTRY[section] ?? null;
}
