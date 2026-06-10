// Structured LLM usage logging — one JSON line per call, greppable as
// [llm-usage] in Vercel/Inngest logs. This is the unit-economics paper trail
// for the free beta: cost per brief, per trip, per user, without a new table.
// If volume ever justifies it, point this at a Supabase llm_usage table.

/**
 * @param {object} args
 * @param {string} args.feature   e.g. 'concierge_brief', 'concierge_reactive'
 * @param {string} args.model
 * @param {object} [args.usage]   Anthropic response.usage
 * @param {object} [args.meta]    small identifiers only (tripId, dayNumber…)
 */
export function logLlmUsage({ feature, model, usage, meta = {} }) {
  try {
    console.log(
      '[llm-usage]',
      JSON.stringify({
        feature,
        model,
        input_tokens: usage?.input_tokens ?? null,
        output_tokens: usage?.output_tokens ?? null,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? null,
        cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? null,
        ...meta,
      })
    );
  } catch {
    /* logging must never break generation */
  }
}
