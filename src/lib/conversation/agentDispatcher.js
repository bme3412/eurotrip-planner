/**
 * Pure dispatch logic for the agent SSE stream.
 *
 * Extracted from useAgentStream so it can be unit-tested without React.
 * The functions here have no React, no fetch, no DOM — they only call
 * the handler callbacks they're given.
 */

/** Names of tool_use events that surface a UI picker on the client. */
export const UI_PICKER_TOOLS = new Set([
  'render_trip_card',
  'render_city_picker',
  'render_options',
  'render_date_picker',
  'render_nights_allocator',
  'confirm_changes',
]);

/** Server-side data tools — the client ignores their tool_use events. */
export const SERVER_DATA_TOOLS = new Set([
  'extract_trip_data',
  'resolve_cities',
  'get_route_options',
  'suggest_cities',
  'get_city_info',
  'optimize_route',
]);

/**
 * Dispatch a single tool_use event from the SSE stream.
 *
 * @param {string} toolName
 * @param {any}    toolInput
 * @param {object} handlers
 * @param {(input: {type: string, data: any}) => void} handlers.setPendingInput
 * @param {(finalized: boolean) => void} [handlers.setIsFinalized]
 * @param {(summary: any) => void}       [handlers.onFinalize]
 * @param {(name: string) => void}       [handlers.onUnknownTool]
 */
export function dispatchToolCall(toolName, toolInput, handlers) {
  if (UI_PICKER_TOOLS.has(toolName)) {
    handlers.setPendingInput({ type: toolName, data: toolInput });
    return;
  }

  if (toolName === 'finalize_trip') {
    if (handlers.onFinalize) {
      handlers.onFinalize(toolInput?.summary);
    } else if (handlers.setIsFinalized) {
      handlers.setIsFinalized(true);
    }
    return;
  }

  if (SERVER_DATA_TOOLS.has(toolName)) {
    // No-op on the client; the server already mutated state.
    return;
  }

  if (handlers.onUnknownTool) handlers.onUnknownTool(toolName);
}

/**
 * Dispatch a single parsed SSE event. Returns the (possibly updated)
 * fullContent buffer so callers can thread it through the stream.
 *
 * Throws on `{ type: 'error' }` — callers decide whether to surface or swallow.
 *
 * @param {object} data            parsed SSE event
 * @param {string} fullContent     accumulated assistant text so far
 * @param {object} handlers
 * @param {(content: string) => void}            handlers.updateLastAssistantMessage
 * @param {(state: object) => void}              handlers.setTripState
 * @param {(name: string, input: any) => void}  [handlers.onToolCall]
 * @param {(input: {type: string, data: any}) => void} handlers.setPendingInput
 * @param {(finalized: boolean) => void}        [handlers.setIsFinalized]
 * @param {(summary: any) => void}              [handlers.onFinalize]
 * @returns {string} updated fullContent
 */
export function dispatchAgentEvent(data, fullContent, handlers) {
  switch (data.type) {
    case 'content':
    case 'content_delta':
      fullContent += data.content || '';
      handlers.updateLastAssistantMessage(fullContent);
      break;

    case 'tool_use':
      dispatchToolCall(data.name, data.input, handlers);
      if (handlers.onToolCall) handlers.onToolCall(data.name, data.input);
      break;

    case 'state_update':
      if (data.state) handlers.setTripState(data.state);
      break;

    case 'tool_result':
    case 'tool_error':
      // Informational; reserved for debug UI.
      break;

    case 'error':
      throw new Error(data.error || 'Server error');

    case 'incomplete':
      if (data.message) {
        fullContent += (fullContent ? '\n\n' : '') + data.message;
        handlers.updateLastAssistantMessage(fullContent);
      }
      break;

    case 'done':
      break;
  }
  return fullContent;
}
