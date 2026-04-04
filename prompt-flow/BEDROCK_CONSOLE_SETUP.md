# Bedrock Console Setup Guide

Step-by-step instructions for the manual AWS console work required by the Bedrock Agents build plan. Complete these in order — each section tells you when it's needed relative to the code phases.

---

## Prerequisites

Before starting, make sure you have:

- An AWS account with Bedrock access in `us-east-1`
- Model access enabled (Bedrock console > Model access > Request for Claude 3.5 Sonnet and Haiku)
- AWS CLI configured locally (`aws sts get-caller-identity` should return your account)
- SAM CLI installed (`sam --version` — install from https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Your `.env.local` populated with `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

---

## 1. Create the Planner Agent (Phase 2)

This agent powers the interactive chat in the app. Start with `RETURN_CONTROL` so tools execute in your Next.js process, then switch to Lambda after deploying the SAM stack.

### 1a. Create the agent

1. Go to **Amazon Bedrock** > **Agents** in the `us-east-1` console
2. Click **Create agent**
3. Fill in:
   - **Agent name:** `eurotrip-planner`
   - **Description:** `Interactive travel planner for EuroTrip Planner app`
   - **Foundation model:** `Anthropic Claude 3.5 Sonnet v2` (or Haiku for cheaper dev testing)
   - **Instructions:** Paste the following (this is the generic version of `buildSystemPrompt()` — trip-specific context gets injected at runtime via session attributes):

```
You are an expert travel planner assistant for EuroTrip Planner.

You help users refine their European travel itineraries by swapping activities, finding new attractions, and checking place details. Trip-specific context (city, dates, interests, current itinerary) will be provided in the first message of each session.

YOUR RULES:
1. You MUST call get_city_attractions before recommending any attraction not already in the plan. Never invent place names, addresses, or coordinates.
2. Before swapping an activity with update_itinerary, you MUST first call get_city_attractions (or get_place_details if you have a place_id) to get accurate details for the replacement.
3. When the user asks to swap/replace/change an activity, identify its [ID:xxx] from the itinerary context and use that exact ID in update_itinerary.
4. Respond conversationally — be concise, friendly, and specific. Explain what you're doing and why the new choice fits the user's interests and pace.
5. If the user asks a question rather than a change request, answer it directly without calling tools.
6. Do not add more than 1-2 new activities per turn unless explicitly asked.
```

4. Under **Advanced prompts**, leave everything at defaults for now
5. Click **Next**

### 1b. Create action groups

You need three action groups. For each one:

1. Click **Add action group**
2. Set **Action group type** to `Define with function details`
3. Set **Action group executor** to `Return control` (you'll switch to Lambda in Phase 3)

#### Action Group: CityData

- **Name:** `CityData`
- **Description:** `Curated city attraction data`
- Add **one function:**

| Function name | Description | Parameters |
|---|---|---|
| `get_city_attractions` | Returns curated attractions for a city, optionally filtered by interest categories. Always call this before recommending any new attraction. | See below |

Parameters for `get_city_attractions`:

| Name | Type | Required | Description |
|---|---|---|---|
| `city` | String | Yes | City slug e.g. "barcelona" |
| `interests` | String | No | JSON array of interest tags e.g. `["food", "history"]` |
| `exclude_names` | String | No | JSON array of attraction names already in the plan |

#### Action Group: GooglePlaces

- **Name:** `GooglePlaces`
- **Description:** `Live place data from Google Places API`
- Add **two functions:**

| Function name | Description |
|---|---|
| `get_place_details` | Fetches live Google Places data: opening hours, rating, review count, price level. Use to verify a place before swapping it in. |
| `search_nearby` | Finds places near a geographic location. Useful for restaurant alternatives, cafes, or discoveries near a point on the itinerary. |

Parameters for `get_place_details`:

| Name | Type | Required | Description |
|---|---|---|---|
| `place_id` | String | Yes | Google Place ID |

Parameters for `search_nearby`:

| Name | Type | Required | Description |
|---|---|---|---|
| `latitude` | Number | Yes | Latitude |
| `longitude` | Number | Yes | Longitude |
| `type` | String | Yes | Place type e.g. "restaurant", "museum", "park", "cafe" |
| `radius` | Number | No | Search radius in meters, default 500 |

#### Action Group: ItineraryMgmt

- **Name:** `ItineraryMgmt`
- **Description:** `Manages the trip itinerary in the database`
- Add **one function:**

| Function name | Description |
|---|---|
| `update_itinerary` | Swaps an existing activity with a new one. Persists to database. Call get_city_attractions or get_place_details first to get accurate details. |

Parameters for `update_itinerary`:

| Name | Type | Required | Description |
|---|---|---|---|
| `activity_id` | String | Yes | ID of the existing trip_activity row to replace |
| `reason` | String | Yes | Human-readable reason for the swap |
| `new_activity` | String | Yes | JSON object with fields: `name` (required), `type`, `description`, `duration_minutes`, `price_range`, `latitude`, `longitude`, `neighborhood`, `indoor`, `booking_url`, `google_place_id` |

### 1c. Create an alias

1. After saving the agent, click **Create alias**
2. **Alias name:** `dev`
3. Note down both IDs:
   - **Agent ID** — shown at the top of the agent detail page (e.g. `ABCDE12345`)
   - **Alias ID** — shown after creating the alias (e.g. `TSTALIASID`)

### 1d. Update your local env

Add to `.env.local`:

```
BEDROCK_AGENT_ID=<your agent ID>
BEDROCK_AGENT_ALIAS_ID=<your alias ID>
NEXT_PUBLIC_AGENT_PROVIDER=bedrock-agent
```

### 1e. Test it

Start the dev server and open the planner chat. It should now route through `agent-bedrock-rc/route.js`, which calls `InvokeAgent` with return control. You'll see tool calls execute locally and results streamed back.

---

## 2. Deploy the SAM Stack (Phase 3)

This deploys the Lambda functions, S3 buckets, and IAM permissions.

### 2a. Prepare parameters

You'll need these values ready:
- `GooglePlacesApiKey` — your Google Places API key
- `SupabaseUrl` — your Supabase project URL
- `SupabaseServiceRoleKey` — your Supabase service role key
- `BedrockAgentId` — the planner agent ID from step 1c

### 2b. Build and deploy

```bash
cd infra

# Validate the template first
sam validate

# Build (transpiles handlers, resolves dependencies)
sam build

# Deploy (first time — will prompt for parameter values)
sam deploy --guided
```

On the guided deploy, fill in:
- **Stack name:** `eurotrip-planner` (or keep default)
- **Region:** `us-east-1`
- **Parameter Stage:** `dev`
- **Parameter GooglePlacesApiKey:** paste your key
- **Parameter SupabaseUrl:** paste your URL
- **Parameter SupabaseServiceRoleKey:** paste your key
- **Parameter BedrockAgentId:** paste your agent ID
- Leave `BedrockBriefingAgentId`, `BedrockBriefingAgentAliasId`, `OpenWeatherMapApiKey`, `ResendApiKey` blank for now (they default to empty)
- **Confirm changeset:** `y`
- **Allow SAM CLI IAM role creation:** `y`
- **Save arguments to samconfig.toml:** `y`

After deploy completes, note the outputs:

```bash
sam list stack-outputs --stack-name eurotrip-planner
```

This prints the Lambda ARNs you'll need for the next step.

### 2c. Sync city data to S3

```bash
cd infra
./sync-city-data.sh dev
```

This uploads all city JSON files from `public/data/` to the `eurotrip-city-data-dev` S3 bucket.

### 2d. Switch action groups to Lambda

Go back to the Bedrock console > Agents > `eurotrip-planner`:

1. **Edit** the `CityData` action group:
   - Change executor from `Return control` to `Lambda function`
   - Select `eurotrip-citydata-dev` from the dropdown
   - Save

2. **Edit** the `GooglePlaces` action group:
   - Change executor to `Lambda function`
   - Select `eurotrip-googleplaces-dev`
   - Save

3. **Edit** the `ItineraryMgmt` action group:
   - Change executor to `Lambda function`
   - Select `eurotrip-itinerary-dev`
   - Save

4. Click **Prepare** to rebuild the agent with the new configuration

5. **Test** in the Bedrock console's built-in test panel to verify each tool works end-to-end

### 2e. Update your app to use the fully-managed agent

The `agent-invoke/route.js` route is already built for this mode. It streams text and traces from the agent without any local tool execution. To switch:

```
# .env.local
NEXT_PUBLIC_AGENT_PROVIDER=bedrock-agent
```

At this point, the app's `PlannerChat.js` will use `agent-bedrock-rc/route.js`. Tools execute in Lambda, so the Next.js server has no tool execution overhead.

---

## 3. Create the Briefing Agent (Phase 3b)

This is a separate, cheaper agent that runs nightly to generate morning briefings.

### 3a. Sign up for API keys

1. **OpenWeatherMap:** https://openweathermap.org/api — sign up for free tier (1000 calls/day). Get your API key from the dashboard.
2. **Resend:** https://resend.com — sign up for free tier (100 emails/day). Get your API key. You'll also need to verify a sending domain or use `onboarding@resend.dev` for testing.

### 3b. Create the agent

1. Go to **Bedrock** > **Agents** > **Create agent**
2. Fill in:
   - **Agent name:** `eurotrip-briefing`
   - **Description:** `Nightly trip briefing generator`
   - **Foundation model:** `Anthropic Claude 3.5 Haiku` (cheaper — this runs nightly for potentially many trips)
   - **Instructions:**

```
You are a trip briefing assistant for EuroTrip Planner.

Given an itinerary for tomorrow, your job is to:
1. Check the weather forecast for the trip city on the given date
2. Review outdoor vs indoor activities and flag weather conflicts
3. If weather is bad for outdoor activities, suggest indoor alternatives using search_nearby or get_city_attractions
4. Check place details for key activities to verify they're open
5. If a place is closed, suggest a nearby alternative

Return a structured briefing with these sections:

## Tomorrow's Plan
Brief summary of the day's activities.

## Weather
Morning and afternoon forecast with temperatures.

## Alerts
Any weather conflicts, closures, or issues. If none, say "No alerts — everything looks good!"

## Tips
2-3 practical tips for the day (what to bring, when to arrive, local customs, etc.)

Be concise and actionable. This goes directly into an email.
```

3. Add **four action groups** (all with `Lambda function` executor since the Lambdas are already deployed):

| Action Group | Lambda | Functions |
|---|---|---|
| `CityData` | `eurotrip-citydata-dev` | `get_city_attractions` (same params as planner) |
| `GooglePlaces` | `eurotrip-googleplaces-dev` | `get_place_details`, `search_nearby` (same params) |
| `ItineraryMgmt` | `eurotrip-itinerary-dev` | `update_itinerary` (same params) |
| `WeatherData` | `eurotrip-weather-dev` | `get_weather_forecast` (see below) |

Parameters for `get_weather_forecast`:

| Name | Type | Required | Description |
|---|---|---|---|
| `city` | String | Yes | City name e.g. "Barcelona" |
| `date` | String | No | Date in YYYY-MM-DD format. Defaults to tomorrow. |

4. Create alias: **`dev`**
5. Note the agent ID and alias ID

### 3c. Redeploy SAM with briefing parameters

```bash
cd infra

sam deploy \
  --parameter-overrides \
    Stage=dev \
    GooglePlacesApiKey=<your key> \
    SupabaseUrl=<your url> \
    SupabaseServiceRoleKey=<your key> \
    BedrockAgentId=<planner agent id> \
    BedrockBriefingAgentId=<briefing agent id> \
    BedrockBriefingAgentAliasId=<briefing alias id> \
    OpenWeatherMapApiKey=<your owm key> \
    ResendApiKey=<your resend key> \
    FromEmail=onboarding@resend.dev
```

This redeploy:
- Configures the weather Lambda with the OWM key
- Configures the briefing orchestrator with the briefing agent IDs, Resend key, and sender email
- Creates the EventBridge rule to trigger nightly at 7 PM UTC

### 3d. Test the briefing manually

Invoke the orchestrator Lambda directly to test without waiting for the cron:

```bash
aws lambda invoke \
  --function-name eurotrip-briefing-dev \
  --payload '{}' \
  /dev/stdout
```

Check CloudWatch Logs for the output. If no active trips exist with tomorrow as a trip day, it will log "Found 0 trips" and exit cleanly.

To test with a real trip, update a trip in Supabase:
```sql
UPDATE trips
SET status = 'active',
    start_date = CURRENT_DATE,
    end_date = CURRENT_DATE + INTERVAL '3 days'
WHERE id = '<your test trip id>';
```

Then re-invoke the Lambda.

---

## 4. Create a Knowledge Base for RAG (Phase 4)

This gives the planner agent rich context from your curated city data without needing explicit tool calls.

### 4a. Export and upload city data

```bash
# Export structured city data to markdown chunks
node scripts/exportCityDataForKB.mjs

# Check what was generated
ls infra/kb-data/ | head -20

# Upload to S3 (requires the SAM stack to be deployed)
node scripts/exportCityDataForKB.mjs --upload --stage=dev
```

This reads every city's attractions, neighborhoods, culinary guide, and monthly seasonal data, converts them to human-readable markdown, and uploads to the `eurotrip-kb-data-dev` S3 bucket.

### 4b. Create the Knowledge Base

1. Go to **Bedrock** > **Knowledge bases** > **Create knowledge base**
2. Fill in:
   - **Name:** `eurotrip-city-guides`
   - **Description:** `Curated city guides for European destinations`
   - **IAM permissions:** `Create and use a new service role`
3. Click **Next**

### 4c. Configure the data source

1. **Data source name:** `city-guide-markdown`
2. **S3 URI:** `s3://eurotrip-kb-data-dev/`
3. **Chunking strategy:** `Fixed-size chunking`
   - **Max tokens:** `512`
   - **Overlap:** `20%`
4. Click **Next**

### 4d. Configure the vector store

1. **Embeddings model:** `Titan Text Embeddings V2`
2. **Vector database:** `Quick create a new vector store` (Bedrock will create an OpenSearch Serverless collection for you)
3. Click **Next** > **Create knowledge base**

This takes 2-5 minutes. Bedrock provisions:
- An OpenSearch Serverless collection
- A vector index
- The necessary IAM policies

### 4e. Sync the data

1. Once the knowledge base is created, go to the **Data source** tab
2. Click **Sync** on the `city-guide-markdown` data source
3. Wait for the sync to complete (progress bar shows in the console — typically 5-15 min depending on data volume)
4. After sync, the **Sync status** column should show `Available` with the number of files indexed

### 4f. Attach the Knowledge Base to the planner agent

1. Go to **Bedrock** > **Agents** > `eurotrip-planner`
2. Scroll down to **Knowledge bases**
3. Click **Add knowledge base**
4. Select `eurotrip-city-guides`
5. **Instructions for the agent:** (this tells the agent when to query the KB)

```
Use this knowledge base to answer open-ended questions about European cities, neighborhoods, local food, seasonal events, and travel tips. Query it when the user asks general questions that don't require a specific tool call, such as "What's the food scene like in Barcelona?" or "Is there anything happening in Prague in December?"
```

6. Click **Add** > **Prepare** (to rebuild the agent)

### 4g. Test it

In the Bedrock console test panel, try:
- "What are the best neighborhoods in Barcelona?"
- "Is there anything special happening in Prague in March?"
- "Tell me about the food scene in Nice"

The agent should answer from the KB without calling any tools. In your app, these answers come back as regular text chunks — no code changes needed.

### 4h. Keeping the KB in sync

When you add or update city data, re-run the export and re-sync:

```bash
# Regenerate markdown + upload
node scripts/exportCityDataForKB.mjs --upload --stage=dev

# Then in Bedrock console: Knowledge bases > eurotrip-city-guides > Data source > Sync
```

Or automate it by adding a sync step to your CI/CD pipeline after data changes.

---

## Quick reference: IDs and env vars

After completing all steps, your `.env.local` should include:

```bash
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your key>
AWS_SECRET_ACCESS_KEY=<your secret>

# Bedrock model (for Phase 1 Converse route)
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-v2:0

# Bedrock Agent (Phase 2+)
BEDROCK_AGENT_ID=<planner agent ID from step 1c>
BEDROCK_AGENT_ALIAS_ID=<planner alias ID from step 1c>

# Agent provider routing
NEXT_PUBLIC_AGENT_PROVIDER=bedrock-agent
```

And your `infra/samconfig.toml` parameter overrides should contain all the SAM parameters filled in from the guided deploy.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `AccessDeniedException` when calling Bedrock | Model access not enabled | Bedrock console > Model access > Request access for the model |
| `ResourceNotFoundException` for agent | Wrong agent ID or alias ID | Double-check IDs in `.env.local` match the console |
| Lambda times out | Cold start + external API latency | Increase `Timeout` in `template.yaml` (default is 30s) |
| `ThrottlingException` | Too many Bedrock API calls | The retry logic in `agent-bedrock/route.js` handles this; wait and retry |
| KB sync fails | S3 bucket is empty or wrong region | Run the export script with `--upload`, verify bucket has files with `aws s3 ls s3://eurotrip-kb-data-dev/` |
| Briefing email not received | Resend domain not verified | Use `onboarding@resend.dev` for testing, or verify your domain in Resend dashboard |
| EventBridge rule not firing | Rule is disabled or wrong cron | Check in EventBridge console > Rules; ensure status is `Enabled` |
| Agent returns "I don't have enough information" | Session attributes not passed | Verify the first message includes trip context via `sessionState.sessionAttributes` |
