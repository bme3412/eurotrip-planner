// Working-trace recorder for agent turns — the persisted "what Olivier
// checked" behind each message. Pure module (no I/O) so caps and merging are
// plain-Node testable.
//
// Shape stored in concierge_messages.meta.trace:
//   { v: 1, ms, steps: [ { t: 'thinking', text }            // ≤280 chars
//                      | { t: 'tool', name, label, ok, summary } ] }

export const TRACE_LIMITS = {
  maxSteps: 12,
  maxThinkingChars: 280,
  maxSummaryChars: 160,
};

export function createTraceRecorder(limits = TRACE_LIMITS) {
  const steps = [];
  let currentThinking = null; // the open thinking step (one per thinking block)

  return {
    /** A new thinking block started — subsequent deltas merge into one step. */
    thinkingBlockStart() {
      currentThinking = { t: 'thinking', text: '' };
      steps.push(currentThinking);
    },
    /** Append a thinking delta to the open block (capped). */
    thinking(text) {
      if (!text) return;
      if (!currentThinking) this.thinkingBlockStart();
      if (currentThinking.text.length < limits.maxThinkingChars) {
        currentThinking.text = (currentThinking.text + text).slice(0, limits.maxThinkingChars);
      }
    },
    /** A tool call started. Closes any open thinking step. */
    toolCall({ name, label }) {
      currentThinking = null;
      steps.push({ t: 'tool', name, label, ok: null, summary: null });
    },
    /** Resolve the most recent unresolved step for this tool. */
    toolResult(name, { ok, summary = null }) {
      for (let i = steps.length - 1; i >= 0; i -= 1) {
        const s = steps[i];
        if (s.t === 'tool' && s.name === name && s.ok === null) {
          s.ok = ok;
          s.summary = summary ? String(summary).slice(0, limits.maxSummaryChars) : null;
          return;
        }
      }
    },
    /**
     * The meta-ready trace, or null when nothing happened. Empty thinking
     * steps are dropped; the step list is capped keeping the FIRST steps
     * (the early deliberation is the interesting part).
     */
    finalize(ms = null) {
      const kept = steps
        .filter((s) => (s.t === 'thinking' ? s.text.trim().length > 0 : true))
        .slice(0, limits.maxSteps)
        .map((s) => (s.t === 'thinking' ? { t: 'thinking', text: s.text.trim() } : s));
      if (!kept.length) return null;
      return { v: 1, ...(ms != null ? { ms } : {}), steps: kept };
    },
  };
}
