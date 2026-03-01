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

## Phase 1: Bedrock Converse API — DONE

**Route:** `src/app/api/plan/agent-bedrock/route.js`
**Shared tools:** `src/lib/planning/agentTools.js`
**Feature flag:** `NEXT_PUBLIC_USE_BEDROCK_AGENT=true`

Same agent loop as OpenAI, but calls Bedrock Converse instead. Your code owns the loop: call model → handle `stopReason: 'tool_use'` → run tools → send `toolResult` → repeat.

### What's done

- `@aws-sdk/client-bedrock-runtime` installed.
- `BEDROCK_TOOL_CONFIG` in `agentTools.js` — same four tools in `toolSpec` format.
- `/api/plan/agent-bedrock` — Converse loop, same SSE contract as OpenAI route.
- `PlannerChat.js` routes to `/api/plan/agent-bedrock` when env flag is set.

### What's missing (TODO)

| Item | Why it matters | File |
|------|----------------|------|
| **ConverseStream** | Currently uses `ConverseCommand` (non-streaming). Entire response arrives at once, then emits a single `delta`. Need `ConverseStreamCommand` for token-by-token streaming. | `agent-bedrock/route.js` |
| **Retry with backoff** | Bedrock can throttle. Need exponential backoff like the OpenAI route. | `agent-bedrock/route.js` |
| **Token/cost tracking** | Converse response includes `usage.inputTokens`, `usage.outputTokens`. Log these per request for cost comparison. | `agent-bedrock/route.js` |
| **Model fallback** | If Bedrock errors (quota, region), fall back to OpenAI agent automatically. | `agent-bedrock/route.js` |

### ConverseStream upgrade (implementation notes)

The streaming response from `ConverseStreamCommand` emits these events via `response.stream`:

```
messageStart         → { role: 'assistant' }
contentBlockStart    → { contentBlockIndex, start: { toolUse?: { toolUseId, name } } }
contentBlockDelta    → { contentBlockIndex, delta: { text } }  ← stream these as SSE delta
                       { contentBlockIndex, delta: { toolUse: { input: '...' } } }  ← accumulate tool input JSON
contentBlockStop     → { contentBlockIndex }
messageStop          → { stopReason: 'end_turn' | 'tool_use' }
metadata             → { usage: { inputTokens, outputTokens }, metrics: { latencyMs } }
```

Key difference from non-streaming: tool use arrives as `contentBlockStart` (with `toolUseId` and `name`) followed by `contentBlockDelta` chunks (with partial JSON in `delta.toolUse.input`). You accumulate the input JSON, then execute the tool after `contentBlockStop`.

---

## Phase 2: Bedrock Agent with Return Control

**Route:** `src/app/api/plan/agent-bedrock-rc/route.js` (to be created)
**Env:** `BEDROCK_AGENT_ID`, `BEDROCK_AGENT_ALIAS_ID`

This is the sweet spot: Bedrock manages the orchestration loop, session memory, and traces — but tool execution stays in your Next.js process. No Lambda needed yet.

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

### Implementation sketch

```javascript
// src/app/api/plan/agent-bedrock-rc/route.js
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const AGENT_ID = process.env.BEDROCK_AGENT_ID;
const ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID;

async function invokeAgent(sessionId, inputText, sessionState) {
  const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const command = new InvokeAgentCommand({
    agentId: AGENT_ID,
    agentAliasId: ALIAS_ID,
    sessionId,
    inputText: sessionState ? undefined : inputText,  // ignored when returnControlInvocationResults present
    enableTrace: true,
    sessionState,
  });
  return client.send(command);
}

// In the SSE stream handler:
// 1. Call invokeAgent(sessionId, userText)
// 2. Iterate response.completion events
// 3. If event has 'returnControl' → run the tool, then call invokeAgent again with sessionState
// 4. If event has 'chunk' → decode bytes, emit as SSE delta
// 5. If trace events → emit as tool_call / tool_result for the UI
```

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

## Phase 3: Lambda action groups

**Route:** same as Phase 2, but tools now run in Lambda instead of your Next.js process.
**Infra:** SAM template at `infra/template.yaml`

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

### SAM template skeleton

```yaml
# infra/template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: EuroTrip Planner — Bedrock Agent action groups

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        SUPABASE_URL: !Ref SupabaseUrl
        SUPABASE_SERVICE_ROLE_KEY: !Ref SupabaseServiceRoleKey
        GOOGLE_PLACES_API_KEY: !Ref GooglePlacesApiKey

Parameters:
  SupabaseUrl:
    Type: String
  SupabaseServiceRoleKey:
    Type: String
    NoEcho: true
  GooglePlacesApiKey:
    Type: String
    NoEcho: true
  BedrockAgentId:
    Type: String

Resources:
  CityDataFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/cityData.handler
      Description: get_city_attractions action group
      Policies:
        - Statement:
            Effect: Allow
            Action: bedrock:InvokeModel
            Resource: '*'

  GooglePlacesFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/googlePlaces.handler
      Description: get_place_details + search_nearby action group

  ItineraryFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/itinerary.handler
      Description: update_itinerary action group

  # Bedrock needs permission to invoke each Lambda
  CityDataInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref CityDataFunction
      Action: lambda:InvokeFunction
      Principal: bedrock.amazonaws.com
      SourceArn: !Sub 'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:agent/${BedrockAgentId}'

  GooglePlacesInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref GooglePlacesFunction
      Action: lambda:InvokeFunction
      Principal: bedrock.amazonaws.com
      SourceArn: !Sub 'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:agent/${BedrockAgentId}'

  ItineraryInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref ItineraryFunction
      Action: lambda:InvokeFunction
      Principal: bedrock.amazonaws.com
      SourceArn: !Sub 'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:agent/${BedrockAgentId}'
```

### Data access from Lambda

| Tool | What it needs | How Lambda gets it |
|------|---------------|-------------------|
| `get_city_attractions` | City JSON files from `public/data/` | Bundle in Lambda layer, or upload to S3 and read at invocation |
| `get_place_details` | Google Places API | HTTP call with `GOOGLE_PLACES_API_KEY` env var |
| `search_nearby` | Google Places API | Same |
| `update_itinerary` | Supabase | `@supabase/supabase-js` with service role key in env |

### Testing locally

```bash
# Install SAM CLI: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
cd infra
sam build
sam local invoke CityDataFunction -e events/get_city_attractions.json
```

---

## Phase 3b: Nightly briefing agent

The agent that makes the app indispensable during the trip. Runs headlessly at ~9 PM local time the night before each day.

### Flow

```
EventBridge rule (cron: 0 21 * * ? *)
  → BriefingOrchestratorLambda
    → Query Supabase for trips with tomorrow as a trip day
    → For each trip:
        → InvokeAgent with context: "Review tomorrow's itinerary for [city].
           Check weather, verify opening hours, suggest swaps if needed.
           Return a structured briefing."
        → Agent calls tools (weather API, get_place_details for each activity, search_nearby for alternatives)
        → Agent returns structured briefing text
    → Send email via SES (or Resend)
```

### Additional tools for the briefing agent

| Tool | Purpose |
|------|---------|
| `get_weather_forecast` | Weather API (OpenWeatherMap or similar). Returns forecast for city + date. |
| `check_opening_hours` | Calls `get_place_details` for each activity, returns open/closed status for the target date. |
| `send_briefing_email` | Formats and sends the email. Could be a separate action group or done by the orchestrator Lambda after the agent returns. |

### Why a separate agent vs reusing the planner agent

The briefing agent has a different system prompt (structured output for email, no conversational back-and-forth), different tools (weather), and runs headlessly. Keep it as a separate agent in Bedrock — same Lambda action groups, different instructions.

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

| Approach | Who runs the loop | Tools run where | Session | Infra needed | Best for |
|----------|-------------------|-----------------|---------|-------------|----------|
| **OpenAI** (current) | Your code | Next.js process | In-memory (sent each request) | None | You already have this |
| **Converse API** (Phase 1) | Your code | Next.js process | In-memory | AWS credentials | Model swap, keep full control |
| **Return Control** (Phase 2) | Bedrock | Next.js process | Bedrock (sessionId) | Agent + alias | Interactive planner, no Lambda yet |
| **Lambda action groups** (Phase 3) | Bedrock | Lambda | Bedrock (sessionId) | Agent + Lambda + IAM | Nightly briefing, production |
| **+ Knowledge base** (Phase 4) | Bedrock | Lambda + KB | Bedrock (sessionId) | Agent + Lambda + KB + S3 | Open-ended Q&A over city data |

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
  lib/planning/
    agentTools.js          ← shared tool defs (OpenAI + Bedrock), executors, system prompt
  app/api/plan/
    agent/route.js         ← OpenAI agent (existing)
    agent-bedrock/route.js ← Phase 1: Converse API agent
    agent-bedrock-rc/      ← Phase 2: Return Control agent (to be created)
    agent-invoke/          ← Phase 3: InvokeAgent with Lambda action groups (to be created)
  components/itinerary/
    PlannerChat.js         ← routes to the active agent based on env

infra/                     ← Phase 3: SAM template + Lambda handlers (to be created)
  template.yaml
  handlers/
    cityData.js
    googlePlaces.js
    itinerary.js
  events/                  ← test events for sam local invoke
    get_city_attractions.json
```
