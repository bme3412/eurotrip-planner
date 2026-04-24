/**
 * Shared JSDoc typedefs describing client/server API contracts.
 * Importing this file (`import '@/lib/api/contracts';`) is harmless at runtime
 * and gives IDE-driven type checking via JSDoc.
 */

/**
 * @typedef {Object} ApiCityListItem
 * @property {string} id            Slug, e.g. "paris".
 * @property {string} name          Display name.
 * @property {string} country       Country directory name.
 * @property {string} directoryName Country/city directory on disk.
 */

/**
 * @typedef {Object} ApiCitiesResponse
 * @property {boolean} success
 * @property {ApiCityListItem[]} data
 * @property {number} count
 * @property {string} timestamp ISO 8601.
 */

/**
 * @typedef {Object} ApiCityDataResponse
 * @property {string} city
 * @property {string} country
 * @property {Object} [overview]
 * @property {Object} [attractions]
 * @property {Object[]} [neighborhoods]
 * @property {Object} [meta]
 */

/**
 * @typedef {Object} ApiSuggestionsRequest
 * @property {{ start: string, end: string }} dates ISO date strings.
 * @property {string} [travelerType] e.g. "couples", "families", "solo".
 * @property {string} [budget]       "budget" | "moderate" | "luxury".
 * @property {string} [originCity]   Source city slug for ease-of-travel scoring.
 * @property {2|4} [v]               Scoring engine version (default 2).
 * @property {boolean} [debug]
 * @property {boolean} [flat]        Return a flat list rather than tiered shape.
 * @property {boolean} [llm]         Use LLM for descriptions (V4 only). Default true.
 * @property {number} [limit]        Max items to return (default 20).
 */

/**
 * @typedef {Object} ApiSuggestionsItem
 * @property {string} city
 * @property {string} country
 * @property {number} score
 * @property {Record<string, number>} [factors]
 * @property {string} [headline]
 */

/**
 * @typedef {Object} ApiSuggestionsResponse
 * @property {ApiSuggestionsItem[]} [items]   Present when `flat: true`.
 * @property {Record<string, { cities: ApiSuggestionsItem[], label?: string }>} [tiers] Present otherwise.
 * @property {Object} meta
 */

/**
 * @typedef {Object} ConversationStreamFrame
 * @property {('content'|'content_delta'|'tool_use'|'tool_result'|'state_update'|'done'|'error')} type
 * @property {string} [content]      Text body for content/content_delta frames.
 * @property {string} [name]         Tool name for tool_use/tool_result.
 * @property {Record<string, any>} [input]  Tool input.
 * @property {any} [result]          Tool result payload.
 * @property {Object} [state]        Updated server-side trip state snapshot.
 * @property {string} [error]
 */

export {};
