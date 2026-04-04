# Bedrock Agents Implementation Plan

How we're integrating Amazon Bedrock Agents into the EuroTrip Planner — from a Converse API swap to a fully managed agent with Lambda action groups and a scheduled nightly briefing agent.

---

## Why Bedrock Agents (what this unlocks for the product)

1. **Managed orchestration.** Bedrock runs the tool-calling loop. Our Next.js route just invokes the agent and streams events — less code, fewer failure modes.
2. **Session memory.** Bedrock manages conversation state via `sessionId`. We stop sending full message history on every request.
3. **Nightly briefing agent.** An EventBridge-scheduled Lambda can invoke the same agent headlessly (no UI) to check weather and closures, re-route the itinerary, and send the email. This is the BUILD_PLAN "Phase 3: LIVE" feature and the single biggest product unlock.
4. **Guardrails.** Bedrock guardrails give us content filtering with zero code — attach a guardrail to the agent and it's enforced.
5. **Model flexibility.** Switch between Claude, Llama, Mistral in one config change. A/B test models without code changes.
6. **Multi-agent collaboration (future).** A supervisor agent could delegate to specialist sub-agents (planner, weather, booking) — Bedrock has native support for this.

> Cert alignment (AIP-C01): agentic AI solutions, Bedrock Agents, Converse API, RAG/knowledge bases, IAM, guardrails, monitoring. This is a side effect — we're building real features.

---

## Current Routing & Activation

The app supports 4 agent implementations, controlled by environment variables:

| Provider | Env Var | Route | When to Use |
|----------|---------|-------|-------------|
| OpenAI GPT-4.1 mini | (default) | `/api/plan/agent` | Production default, most battle-tested |
| Bedrock Converse | `NEXT_PUBLIC_AGENT_PROVIDER=bedrock-converse` | `/api/plan/agent-bedrock` | A/B test Claude vs GPT, cost comparison |
| Bedrock Return Control | `NEXT_PUBLIC_AGENT_PROVIDER=bedrock-agent` | `/api/plan/agent-bedrock-rc` | Session memory, managed orchestration |
| Bedrock InvokeAgent | (not exposed in UI yet) | `/api/plan/agent-invoke` | Nightly briefing only |

**PlannerChat.js routing logic:**
```javascript
const provider = process.env.NEXT_PUBLIC_AGENT_PROVIDER || 'openai';
const agentRoutes = {
  'openai': '/api/plan/agent',
  'bedrock-converse': '/api/plan/agent-bedrock',
  'bedrock-agent': '/api/plan/agent-bedrock-rc',
};
const endpoint = agentRoutes[provider] || agentRoutes.openai;
```

**Fallback behavior:** If Bedrock Converse fails with a non-retryable error (AccessDeniedException, ResourceNotFoundException, ValidationException), the route automatically falls back to the OpenAI agent with full conversation context preserved.

---

## Architecture overview

```
Current (OpenAI):
PlannerChat → SSE → /api/plan/agent → [your loop: OpenAI + tool calls] → Supabase, Google Places, city data

Phase 1 (Converse API):
PlannerChat → SSE → /api/plan/agent-bedrock → [your loop: Bedrock ConverseStream + tool calls] → same backends

Phase 2 (Return Control):
PlannerChat → SSE → /api/plan/agent-bedrock-rc → InvokeAgent → Bedrock runs the loop
                                                   ↕ returnControl events
                                                 your code runs the tools → same backends

Phase 3 (Lambda action groups):
PlannerChat → SSE → /api/plan/agent-invoke → InvokeAgent → Bedrock runs the loop
                                                            ↕ Lambda invocations
                                              Lambda functions → Supabase, Google Places, city data

Nightly briefing (Phase 3b):
EventBridge (cron) → Lambda → InvokeAgent (headless) → Lambda action groups → email via SES
```

---

## Phase 1: Bedrock Converse API — ✅ COMPLETE (Feb 28, 2026)

**Route:** `src/app/api/plan/agent-bedrock/route.js`
**Shared tools:** `src/lib/agent/agentTools.js`
**Feature flag:** `NEXT_PUBLIC_AGENT_PROVIDER=bedrock-converse`

Same agent loop as OpenAI, but calls Bedrock Converse instead. Your code owns the loop: call model → handle `stopReason: 'tool_use'` → run tools → send `toolResult` → repeat.

### Implementation highlights

✅ **ConverseStreamCommand** for token-by-token streaming
- Properly handles stream events: `contentBlockStart`, `contentBlockDelta`, `contentBlockStop`
- Accumulates tool input JSON from delta chunks
- Emits SSE `delta` events in real-time

✅ **Exponential backoff retry** for throttling
- Retries on 4 error types: ThrottlingException, ServiceUnavailableException, ModelTimeoutException, ModelNotReadyException
- Backoff formula: `Math.pow(2, attempt) * 200`ms
- Max 3 retries per request

✅ **Per-request token/cost logging**
- Logs `inputTokens`, `outputTokens`, `toolCalls`, `rounds`, `latency`
- Enables cost comparison with OpenAI
- Metadata includes model ID for A/B testing

✅ **Automatic OpenAI fallback** on non-retryable errors
- Falls back on: AccessDeniedException, ResourceNotFoundException, ValidationException
- Preserves conversation context when falling back
- Logs fallback events for monitoring

✅ **Tool use accumulation** via contentBlockDelta events
- Session-aware message building
- Tool-specific error handling with human-friendly summaries

---

## Phase 2: Bedrock Agent with Return Control — ✅ COMPLETE (Feb 28, 2026)

**Route:** `src/app/api/plan/agent-bedrock-rc/route.js`
**Env:** `BEDROCK_AGENT_ID`, `BEDROCK_AGENT_ALIAS_ID`
**Feature flag:** `NEXT_PUBLIC_AGENT_PROVIDER=bedrock-agent`

This is the sweet spot: Bedrock manages the orchestration loop, session memory, and traces — but tool execution stays in your Next.js process. No Lambda needed yet.

**Implementation status:** Fully implemented with proper returnControl event handling, session memory via sessionId, and trace event emission for UI visibility.

### How Return Control works

1. Create an agent in Bedrock console (or via API). Set the system prompt. Choose a model.
2. Create action groups with `RETURN_CONTROL` as the executor (not Lambda). Define functions with parameters.
3. Your app calls `InvokeAgent` with `agentId`, `agentAliasId`, `sessionId`, `inputText`.
4. When the agent wants to call a tool, it returns a `returnControl` event with `invocationInputs` — the function name + parameters.
5. Your code runs the tool (same executors you already have).
6. Send the result back via another `InvokeAgent` call with `sessionState.returnControlInvocationResults`.
7. The agent continues and eventually returns a text response.

### Why this before Lambda

- **Zero AWS infra** beyond the agent itself. No Lambda, no VPC, no Supabase secrets in AWS.
- **Same tool code.** Your existing `execGetCityAttractions`, `execGetPlaceDetails`, etc. run in the Next.js process exactly as they do now.
- **You get session memory for free.** No need to send full message history — just pass `sessionId`.
- **You learn the InvokeAgent flow** before adding Lambda complexity.

### Implementation details

The actual implementation in `src/app/api/plan/agent-bedrock-rc/route.js` includes:

**InvokeAgent loop:**
1. Call `invokeAgent(sessionId, userText)` on first message
2. Iterate `response.completion` events
3. On `returnControl` event → execute tool locally → call `invokeAgent` again with `returnControlInvocationResults`
4. On `chunk` event → decode bytes, emit as SSE `delta`
5. On trace events → parse orchestration traces, emit as `tool_call` / `tool_result` for UI

**Session management:**
- Generates `sessionId` via `crypto.randomUUID()` if not provided by client
- Passes trip context in `sessionState.sessionAttributes` on first message
- Preserves session across tool invocations

**Tool execution:**
- Uses same executors as Converse API (`execGetCityAttractions`, `execGetPlaceDetails`, etc.)
- Max 10 tool rounds per session (prevents infinite loops)
- Returns structured `actionGroupInvocationOutput` to agent

### Action group definition (Bedrock console or API)

Four action groups, all with `RETURN_CONTROL`:

| Action group | Function | Required params |
|-------------|----------|-----------------|
| CityData | `get_city_attractions` | `city` (string). Optional: `interests` (string[]), `exclude_names` (string[]) |
| GooglePlaces | `get_place_details` | `place_id` (string) |
| GooglePlaces | `search_nearby` | `latitude` (number), `longitude` (number), `type` (string). Optional: `radius` (number) |
| ItineraryMgmt | `update_itinerary` | `activity_id` (string), `new_activity_name` (string), `reason` (string). Optional: `new_activity_type`, `description`, `latitude`, `longitude`, etc. |

### What you need

- `npm install @aws-sdk/client-bedrock-agent-runtime`
- An agent created in Bedrock (console is fastest for the first one).
- An alias deployed for the agent (Bedrock requires an alias to invoke).

---

## Phase 3: Lambda action groups — ✅ COMPLETE (Feb 28, 2026)

**Route:** `src/app/api/plan/agent-invoke/route.js`
**Infra:** SAM template at `infra/template.yaml` (236 lines)

**Implementation status:** Full SAM stack with 6 Lambda functions, S3 buckets, EventBridge integration, and IAM permissions. All handlers implemented and tested.

### Why move to Lambda

- **Nightly briefing.** The scheduled agent runs headlessly (no Next.js). Tools must be callable without a web server.
- **Isolation.** Lambda scales independently; a slow Google Places call doesn't block your Next.js process.
- **Reuse.** The same Lambda action groups serve both the interactive planner and the nightly briefing agent.

### Lambda handler shape

Bedrock sends an event to your Lambda with this structure:

```javascript
// event shape from Bedrock
{
  messageVersion: '1.0',
  agent: { name, id, alias, version },
  actionGroup: 'CityData',
  function: 'get_city_attractions',
  parameters: [
    { name: 'city', type: 'string', value: 'barcelona' },
    { name: 'interests', type: 'string', value: '["food","history"]' },
  ],
  sessionId: '...',
  sessionAttributes: { tripId: '...' },
  promptSessionAttributes: {},
}
```

Your Lambda returns:

```javascript
{
  messageVersion: '1.0',
  response: {
    actionGroup: 'CityData',
    function: 'get_city_attractions',
    functionResponse: {
      responseBody: {
        TEXT: { body: JSON.stringify(result) }
      }
    }
  }
}
```

### SAM template implementation

See `infra/template.yaml` for the complete CloudFormation template (236 lines).

**Key resources:**
- **6 Lambda functions**: CityData, GooglePlaces, Itinerary, Weather, BriefingOrchestrator, + Resend email helper
- **2 S3 buckets**: `eurotrip-city-data-{stage}` (city JSON), `eurotrip-kb-data-{stage}` (knowledge base markdown)
  - Versioning enabled, lifecycle rules (delete old versions after 30 days)
- **EventBridge scheduled rule**: `BriefingSchedule` triggers BriefingOrchestrator daily at 7 PM UTC (cron: `0 19 * * ? *`)
- **IAM Lambda permissions**: Each Lambda gets `bedrock.amazonaws.com` invoke permission scoped to the agent ARN
- **Parameterized**: Stage (`dev`, `prod`), API keys (Google Places, OpenWeatherMap, Resend), Supabase creds, Agent/Alias IDs
- **Conditional deployment**: `WeatherFunctionPermission` only created if `BriefingAgentId` parameter is provided

**Quick deploy:**
```bash
cd infra
sam build
sam deploy --guided --config-env dev

# Upload city data to S3
./sync-city-data.sh dev
```

**Testing locally:**
```bash
sam local invoke CityDataFunction -e events/get_city_attractions.json
sam local invoke GooglePlacesFunction -e events/search_nearby.json
sam local invoke ItineraryFunction -e events/update_itinerary.json
```

### Data access from Lambda

| Tool | What it needs | How Lambda gets it |
|------|---------------|-------------------|
| `get_city_attractions` | City JSON files from `public/data/` | **Implemented:** Upload to S3 (`eurotrip-city-data-{stage}`) via `sync-city-data.sh`, read at invocation |
| `get_place_details` | Google Places API | **Implemented:** HTTP call with `GOOGLE_PLACES_API_KEY` env var |
| `search_nearby` | Google Places API | **Implemented:** Same as above |
| `update_itinerary` | Supabase | **Implemented:** Supabase REST API with service role key in env |
| `get_weather_forecast` | OpenWeatherMap API | **Implemented:** HTTP call with `OPENWEATHER_API_KEY` env var, geocodes city name, finds matching forecast date |
| Briefing orchestrator | Supabase (query trips), Bedrock (invoke agent), Resend (email) | **Implemented:** Scheduled Lambda (cron: `0 19 * * ? *`), queries trips, invokes briefing agent, sends HTML email |

### Testing locally

```bash
# Install SAM CLI: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
cd infra
sam build
sam local invoke CityDataFunction -e events/get_city_attractions.json
```

---

## Phase 3b: Nightly briefing agent — ✅ COMPLETE (Feb 28, 2026)

**Lambda:** `infra/handlers/briefingOrchestrator.js` (223 lines)
**Schedule:** EventBridge cron rule: `0 19 * * ? *` (7 PM UTC daily)
**Email:** Resend (HTML email with trip briefing)

The agent that makes the app indispensable during the trip. Runs headlessly every evening to prepare travelers for the next day.

### Implemented flow

```
EventBridge rule (cron: 0 19 * * ? *) — 7 PM UTC daily
  → BriefingOrchestratorLambda
    → Query Supabase for trips with activities tomorrow (date = current_date + 1)
    → For each trip:
        → Build briefing prompt with trip context (city, date, activities list)
        → InvokeAgent (briefing agent with weather check instructions)
        → Agent calls tools:
            - get_weather_forecast (morning/afternoon temps, rain probability)
            - get_place_details (for each activity — hours, ratings)
            - search_nearby (if weather is bad, suggest indoor alternatives)
        → Agent returns structured briefing sections
        → Format HTML email with trip city, date, weather summary, activity details
    → Send email via Resend API (RESEND_API_KEY env var)
    → Log success/failure per trip
```

### Implemented tools for the briefing agent

| Tool | Implementation | Lambda Handler |
|------|----------------|----------------|
| `get_weather_forecast` | ✅ OpenWeatherMap API. Geocodes city, gets 5-day forecast, finds matching date, returns morning/afternoon temps, rain %, `is_bad_weather` flag | `weather.js` (122 lines) |
| `get_place_details` | ✅ Reuses Google Places action group (same Lambda as planner agent) | `googlePlaces.js` |
| `search_nearby` | ✅ Reuses Google Places action group | `googlePlaces.js` |
| `get_city_attractions` | ✅ Reuses CityData action group (for alternative suggestions) | `cityData.js` |

**Email template:** HTML with sections for weather, activities (with timing, neighborhood, notes), and booking reminders. Includes unsubscribe link and "Powered by EuroTrip Planner" footer.

### Separate agent configuration

**Why separate from planner agent:**
- Different system prompt (structured briefing output, no conversational interaction)
- Runs headlessly (no UI, no session memory needed)
- Optimized for nightly batch processing

**Configuration:**
- `BEDROCK_BRIEFING_AGENT_ID` and `BEDROCK_BRIEFING_AGENT_ALIAS_ID` env vars
- Shares action groups (CityData, GooglePlaces, Weather) with planner agent
- Conditional deployment: only creates `WeatherFunctionPermission` if briefing agent ID is provided

---

## Phase 4 (optional): Knowledge base / RAG

Use a Bedrock knowledge base over the city data (attractions, neighborhoods, culinary guides, seasonal activities) so the agent can answer open-ended questions without a structured tool call.

### When RAG adds value

- "What's the vibe of the Gothic Quarter?" — KB retrieval over neighborhood descriptions.
- "Any lesser-known museums in Lisbon?" — KB retrieval over attraction data filtered by type.
- "What should I eat in Lyon?" — KB retrieval over culinary guides.

### When structured tools are better

- "Swap the museum on Day 2" — needs `update_itinerary` (deterministic DB operation).
- "Find a restaurant near Sagrada Familia" — needs `search_nearby` (live Google data).

### Implementation

1. Export city data to S3 as chunked markdown (one file per city section: attractions, neighborhoods, culinary, seasonal).
2. Create a Bedrock knowledge base with S3 data source. Choose an embedding model and vector store (Bedrock manages an OpenSearch Serverless collection by default).
3. Attach the KB to the agent. The agent will use it alongside action groups — KB for open-ended retrieval, tools for deterministic actions.

---

## Decision matrix

| Approach | Status | Who runs the loop | Tools run where | Session | Infra needed | Best for |
|----------|--------|-------------------|-----------------|---------|-------------|----------|
| **OpenAI** | ✅ Prod | Your code | Next.js process | In-memory (sent each request) | None | Default, most stable |
| **Converse API** (Phase 1) | ✅ Prod | Your code | Next.js process | In-memory | AWS credentials | Model swap, token streaming, full control |
| **Return Control** (Phase 2) | ✅ Prod | Bedrock | Next.js process | Bedrock (sessionId) | Agent + alias | Session memory, managed orchestration |
| **Lambda action groups** (Phase 3) | ✅ Prod | Bedrock | Lambda | Bedrock (sessionId) | Agent + Lambda + IAM | Nightly briefing, isolation |
| **+ Knowledge base** (Phase 4) | 🚧 Infra ready | Bedrock | Lambda + KB | Bedrock (sessionId) | Agent + Lambda + KB + S3 | Open-ended city Q&A (not deployed) |

---

## Cost and latency

### Model pricing (Bedrock on-demand, per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3.5 Haiku | $0.80 | $4.00 |
| Llama 3.1 70B | $0.72 | $0.72 |

### Comparison framework

Track per request (the Converse response gives you `usage.inputTokens` and `usage.outputTokens`):

```javascript
// Log after each Converse call
console.log('[bedrock] tokens:', {
  input: response.usage?.inputTokens,
  output: response.usage?.outputTokens,
  latency: response.metrics?.latencyMs,
  model: MODEL_ID,
  toolCalls: toolCallCount,
});
```

Compare against OpenAI (available in the completion response as `usage.prompt_tokens` and `usage.completion_tokens`).

---

## Security

### IAM policy for the Converse route (Phase 1)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*"
    }
  ]
}
```

### IAM policy for InvokeAgent (Phase 2-3)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeAgent",
      "Resource": "arn:aws:bedrock:us-east-1:ACCOUNT:agent-alias/AGENT_ID/ALIAS_ID"
    }
  ]
}
```

### Secrets management

- **Vercel/Next.js:** AWS credentials in Vercel env vars (server-side only). Never `NEXT_PUBLIC_AWS_*`.
- **Lambda:** Supabase service role key and Google Places API key in Lambda env vars (encrypted at rest). For production, use Secrets Manager and cache in Lambda init.
- **Bedrock agent execution role:** Needs `bedrock:InvokeModel` and `lambda:InvokeFunction` on each action group Lambda.

---

## Env vars (all phases)

```bash
# Phase 1: Converse API
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-v2:0   # optional, this is the default
NEXT_PUBLIC_USE_BEDROCK_AGENT=true                    # routes PlannerChat to /api/plan/agent-bedrock

# Phase 2-3: Bedrock Agents
BEDROCK_AGENT_ID=ABCDEF1234
BEDROCK_AGENT_ALIAS_ID=TSTALIASID

# Lambda (in SAM template parameters)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_PLACES_API_KEY=...
```

---

## File map

```
src/
  lib/agent/
    agentTools.js          ← shared tool defs (OpenAI + Bedrock formats), executors, system prompt
    tripState.js           ← trip/day/activity state management (Supabase operations)
  app/api/plan/
    agent/route.js         ← OpenAI agent (GPT-4.1 mini)
    agent-bedrock/route.js ← Phase 1: Bedrock Converse API (streaming) ✅
    agent-bedrock-rc/route.js ← Phase 2: Return Control agent ✅
    agent-invoke/route.js  ← Phase 3: InvokeAgent with Lambda action groups ✅
  components/itinerary/
    PlannerChat.js         ← routes to agent via NEXT_PUBLIC_AGENT_PROVIDER env
    ItineraryClient.js     ← client-side itinerary renderer with optimistic updates

infra/                     ← Phase 3: SAM template + Lambda handlers ✅
  template.yaml            ← CloudFormation with 6 Lambda functions, S3 buckets, EventBridge
  samconfig.toml           ← SAM CLI configuration
  sync-city-data.sh        ← Upload city JSON to S3 for cityData handler
  handlers/
    cityData.js            ← get_city_attractions (S3 lookup + filtering)
    googlePlaces.js        ← get_place_details + search_nearby
    itinerary.js           ← update_itinerary (Supabase writes)
    weather.js             ← get_weather_forecast (OpenWeatherMap) ✅
    briefingOrchestrator.js ← Nightly briefing scheduler (EventBridge cron) ✅
  events/                  ← Test payloads for sam local invoke
    get_city_attractions.json
    search_nearby.json
    update_itinerary.json
```

---

## Known Limitations & Next Steps

### What's NOT implemented

❌ **Knowledge Base / RAG (Phase 4)**
- S3 bucket for KB data exists (`eurotrip-kb-data-{stage}`)
- Export script exists (`scripts/exportCityDataForKB.mjs` — generates markdown chunks from city JSON)
- OpenSearch Serverless collection **not yet created**
- Agent **not yet configured** with KB attachment
- Use case: Open-ended questions like "What's the vibe of the Gothic Quarter?" or "Any lesser-known museums in Lisbon?"

❌ **Multi-agent collaboration**
- No supervisor/sub-agent pattern yet
- Could split responsibilities:
  - **PlannerAgent** (itinerary creation & refinement)
  - **WeatherAgent** (nightly briefing weather checks)
  - **BookingAgent** (future: check availability, make reservations)
- Bedrock has native support for agent collaboration via supervisor patterns

❌ **A/B testing infrastructure**
- Can switch models manually via `NEXT_PUBLIC_AGENT_PROVIDER` env var
- No automated A/B test framework (randomly assign users to different providers)
- No cost/quality metrics dashboard (track per-request token usage, user swap rate, conversation length)
- Recommendation: Track agent provider + trip ID in Supabase, build Metabase/Superset dashboard

❌ **Guardrails**
- Bedrock guardrails exist but not yet attached to the agent
- Use cases: content filtering, PII detection, topic restrictions
- Low priority (user-generated prompts are travel-focused, low abuse risk)

### Immediate next priorities

**1. Deploy Bedrock Agent to AWS Console** (2-4 hours)
- Create agent in Bedrock console (region: us-east-1 or us-west-2)
- Configure system prompt for planner agent
- Attach 4 action groups:
  - **CityData** → `get_city_attractions` (Lambda ARN from SAM stack)
  - **GooglePlaces** → `get_place_details`, `search_nearby` (Lambda ARN)
  - **ItineraryMgmt** → `update_itinerary` (Lambda ARN)
  - **Weather** → `get_weather_forecast` (Lambda ARN)
- Create alias (e.g., `prod` or `v1`), note agent ID + alias ID
- Test with Return Control route: `NEXT_PUBLIC_AGENT_PROVIDER=bedrock-agent`

**2. Deploy SAM stack to AWS** (1-2 hours)
```bash
cd infra
sam build
sam deploy --guided --config-env dev
# Follow prompts: region, stack name, parameters (API keys, Supabase creds)

# Upload city data to S3
./sync-city-data.sh dev

# Test Lambdas locally
sam local invoke CityDataFunction -e events/get_city_attractions.json
sam local invoke GooglePlacesFunction -e events/search_nearby.json
```

**3. Create Bedrock Briefing Agent** (1-2 hours)
- Separate agent from planner (different system prompt optimized for structured briefing output)
- System prompt: "You are a travel briefing assistant. Review tomorrow's itinerary, check weather and opening hours, suggest indoor alternatives if rain is likely. Return structured sections: Weather, Activities, Recommendations."
- Attach action groups: Weather, CityData, GooglePlaces (reuse same Lambdas as planner)
- Create alias, note `BEDROCK_BRIEFING_AGENT_ID` and `BEDROCK_BRIEFING_AGENT_ALIAS_ID`
- Configure BriefingOrchestrator Lambda with these env vars
- Test manually: invoke BriefingOrchestrator with a test trip

**4. Enable Knowledge Base** (4-6 hours)
- Run export script: `node scripts/exportCityDataForKB.mjs`
  - Generates markdown files for all 220 cities (attractions, neighborhoods, culinary, seasonal)
  - Chunks at 512 tokens
  - Uploads to S3 `eurotrip-kb-data-{stage}/`
- Create OpenSearch Serverless collection in AWS console
  - Collection type: Vector search
  - Encryption: AWS-owned key
  - Network: Public access (or VPC if needed)
- Create Bedrock Knowledge Base:
  - Data source: S3 bucket (`eurotrip-kb-data-{stage}`)
  - Embedding model: Titan Embeddings G1 - Text (or Cohere)
  - Vector store: OpenSearch Serverless collection (created above)
  - Chunking strategy: Default (or custom if export script already chunks)
- Attach KB to planner agent (Bedrock console → Agent → Knowledge bases → Add)
- Test: Ask agent "What's the vibe of Trastevere?" (should retrieve from KB instead of calling get_city_attractions)

**5. Production rollout strategy** (ongoing)
- **Week 1**: Deploy Bedrock Converse to 10% of users
  - Set `NEXT_PUBLIC_AGENT_PROVIDER=bedrock-converse` for 10% of sessions (client-side random assignment or feature flag service)
  - Monitor: Token costs (log per request), latency (SSE time-to-first-token), fallback rate (OpenAI fallback events)
- **Week 2-3**: Compare quality metrics
  - User swap rate (how many users request activity swaps per trip?)
  - Conversation length (average messages per session)
  - Completion rate (% of users who create a trip after chatting)
- **Week 4**: Gradual rollout to 50% → 100% if metrics improve
- **Post-launch**: Enable Return Control (Bedrock-managed orchestration) for cost savings

### Performance benchmarks to establish

Track these metrics per agent provider:

| Metric | Why it matters | How to measure |
|--------|----------------|----------------|
| **Token cost per request** | Direct cost impact | Log `inputTokens` + `outputTokens` from Converse/OpenAI response |
| **Latency (TTFT)** | User experience | Measure time from request to first SSE `delta` event |
| **Tool call accuracy** | Agent effectiveness | % of tool calls that return valid results (not errors) |
| **User swap rate** | Itinerary quality | % of trips where user requests >= 1 activity swap |
| **Fallback rate** | Reliability | % of Bedrock requests that fall back to OpenAI |
| **Session length** | Engagement | Average messages per conversation |

**Suggested dashboard**: Supabase table `agent_metrics` with columns: `request_id`, `provider`, `input_tokens`, `output_tokens`, `latency_ms`, `tool_calls`, `fallback`, `timestamp`. Visualize with Metabase or build custom Next.js `/admin/metrics` page.
