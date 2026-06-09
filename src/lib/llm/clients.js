/**
 * Shared LLM client factories. One lazily-constructed singleton per provider
 * instead of a `new Anthropic()` per request, so configuration lives in one
 * place and tests can stub a client where call sites accept one.
 *
 * Getters return null when the provider's API key is not configured —
 * callers branch to their fallback path instead of wrapping in try/catch.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

let anthropic = null;
let openai = null;

/** @returns {Anthropic|null} */
export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!anthropic) anthropic = new Anthropic({ apiKey });
  return anthropic;
}

/** @returns {OpenAI|null} */
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!openai) openai = new OpenAI({ apiKey });
  return openai;
}
