/**
 * Overview generator (LLM).
 *
 * Refreshes the editorial top-of-page fields (`brief_description`,
 * `subtitle`) using Anthropic, preserving the rest of the overview payload
 * verbatim. This narrow scope keeps prompts cheap and predictable; the
 * structured fields (population, sections, things_to_do_tiers) are owned by
 * deterministic scripts elsewhere and should not be touched here.
 *
 * Behavior when ANTHROPIC_API_KEY is unset:
 *   The generator returns the existing payload unchanged and logs a warning,
 *   so `pnpm refresh` is safe to run in environments without credentials.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = resolve(__dirname, '..', 'prompts', 'overview.md');
const MODEL = process.env.REFRESH_OVERVIEW_MODEL || 'claude-opus-4-5-20251101';

export const meta = {
  section: 'overview',
  kind: 'llm',
  source: `llm:${MODEL}`,
};

function buildPrompt(template, vars) {
  return template.replace(/\$\{([A-Z_]+)\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? '' : String(v);
  });
}

async function callAnthropic({ prompt, logger }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn('ANTHROPIC_API_KEY is not set — overview generator is a no-op');
    return null;
  }
  // Dynamic import keeps the SDK out of the dependency graph for users who
  // never run the refresh CLI (e.g. CI doing a static build).
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res?.content?.[0]?.text;
  if (!text) throw new Error('Anthropic response missing text content');
  // The model is asked to return raw JSON; tolerate ```json fences.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

/**
 * @param {{ city: { citySlug: string, countrySlug: string, contentPath: string }, current: any, ctx: { repoRoot: string, logger: any } }} input
 */
export async function generate({ city, current, ctx }) {
  const logger = ctx.logger;
  if (!current) {
    logger.warn(`${city.citySlug}/overview: no current payload to refresh; skipping`);
    return null;
  }

  const template = await readFile(PROMPT_PATH, 'utf8');
  const prompt = buildPrompt(template, {
    CITY_NAME: current.city_name || city.citySlug,
    COUNTRY: current.country || city.countrySlug,
    CURRENT_DESCRIPTION: current.brief_description || '',
    CURRENT_SUBTITLE: current.subtitle || '',
    NICKNAME: current.nickname || '',
  });

  const completion = await callAnthropic({ prompt, logger });
  if (!completion) return current; // no-op fallback when key is missing

  const next = {
    ...current,
    brief_description: completion.brief_description || current.brief_description,
    subtitle: completion.subtitle || current.subtitle,
  };
  return next;
}
