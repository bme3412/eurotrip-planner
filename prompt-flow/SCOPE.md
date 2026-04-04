# EuroTrip Planner — Project Scope

*Last updated: March 1, 2026*

---

## What This Project Does

**EuroTrip Planner is an AI-powered travel planning platform for European destinations.** It helps travelers discover, plan, and optimize multi-day trips across 220+ European cities through intelligent itinerary generation, conversational refinement, and real-time travel intelligence.

### Core Value Proposition

Traditional travel planning requires hours of research across fragmented sources—guidebooks, blogs, forums, maps—with no easy way to personalize recommendations to your travel style, timing, and interests. EuroTrip Planner solves this by:

1. **Consolidating expert knowledge** for 220 European cities in a structured, queryable format
2. **Generating personalized day-by-day itineraries** based on your dates, pace, interests, and budget
3. **Enabling conversational refinement** via AI agents that understand context and make intelligent swaps
4. **Providing timing intelligence** through seasonal data, visit calendars, and weather-aware recommendations
5. **Delivering live trip support** with nightly briefings that check conditions and suggest adjustments

---

## How It Works

### User Journey

**1. Discovery Phase**
- Browse 220+ European cities with rich content (attractions, neighborhoods, culinary guides, seasonal activities)
- Filter by region, country, tourism category (cultural, coastal, alpine, etc.)
- View timing intelligence: best months to visit, crowd levels, events, weather patterns
- Explore interactive maps with attraction clusters

**2. Planning Phase**
- **Single-City Planning**:
  - Select a city (e.g., Barcelona)
  - Configure trip preferences: dates, pace, interests, budget
  - Generate initial itinerary (server-side engine with interest matching and time-block scheduling)

- **Multi-City Planning** (NEW):
  - Select multiple cities or choose from route templates (e.g., "Spanish Mediterranean: Barcelona → Valencia → Mallorca")
  - AI-optimized city sequencing (3 route variants: Fastest, Scenic, Most Budget-Friendly)
  - AI-recommended day allocation with rationale per city
  - Automatic transport integration (train/flight/bus times, prices, booking deep-links)
  - Visual route map showing connections and travel days

**3. Refinement Phase (Agentic AI)**
- Chat with an AI agent to refine your itinerary:
  - "Replace the museum with something outdoors"
  - "I've already visited Sagrada Familia"
  - "Find a rooftop bar for sunset on Day 2"
- Agent uses 4 grounded tools:
  - `get_city_attractions` → Reads structured city data, filters by interests
  - `get_place_details` → Live Google Places API (hours, ratings, photos)
  - `search_nearby` → Finds alternatives near coordinates
  - `update_itinerary` → Swaps activities in database, updates UI in real-time
- Multi-provider architecture: OpenAI GPT-4.1 mini or AWS Bedrock Claude 3.5 Sonnet

**4. Pre-Trip Phase**
- Save cities and experiences to wishlist (Supabase for authenticated users, localStorage for anonymous)
- Export itinerary to PDF
- Share trip via social media

**5. Live Trip Phase (Nightly Briefing)**
- Scheduled Lambda runs every evening (7 PM UTC)
- Queries Supabase for trips with activities tomorrow
- Invokes AI agent with briefing prompt (weather check, opening hours verification, indoor alternative suggestions)
- Agent calls tools:
  - `get_weather_forecast` → OpenWeatherMap (morning/afternoon temps, rain probability)
  - `get_place_details` → Verify hours for each activity
  - `search_nearby` → Find indoor alternatives if bad weather
- Sends HTML email via Resend with weather summary, activity details, booking reminders

**6. Post-Trip Phase (Future)**
- Upload photos → AI-generated trip summary with photo matching to locations
- Review and rate experiences

---

## Why This Project Exists

### Problem Statement

**Travel planning is fragmented, time-consuming, and not personalized.**

- **Fragmentation**: Information scattered across Lonely Planet, blogs, TripAdvisor, Google Maps, Reddit threads
- **No timing intelligence**: "When should I visit Barcelona?" requires hours of research on weather, crowds, events
- **No personalization**: Generic "Top 10" lists don't account for your interests, pace, or travel style
- **Static itineraries**: Pre-made itineraries can't be easily adjusted ("swap museum for outdoor activity")
- **No live support**: Once you're on the trip, you're on your own if weather changes or a place is unexpectedly closed

### Solution Approach

**Structured data + AI agents + live intelligence = effortless personalized planning**

1. **Structured city data** (3,200+ JSON files) provides queryable, consistent information across 220 cities
2. **AI agents** enable conversational refinement instead of manual itinerary editing
3. **Live data integration** (Google Places, weather APIs) ensures recommendations are current
4. **Nightly briefings** provide proactive support during the trip

### Market Opportunity

- **TAM**: 746 million international arrivals to Europe in 2023 (pre-pandemic: 746M in 2019, UNWTO)
- **Planning friction**: Average traveler spends 10-15 hours researching a week-long trip
- **Monetization paths**:
  - **Subscription (Pro tier)**: $9-15/month for unlimited trips, nightly briefings, priority support
  - **Affiliate revenue**: GetYourGuide (tours), Booking.com (hotels), Airalo (eSIMs), SafetyWing (insurance)
  - **Provider marketplace**: Local guides, experiences, restaurants pay commission for bookings
  - **B2B licensing**: Travel agencies, tour operators license city data API

---

## Technical Architecture

### Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 (App Router) + React 19 | Server/client components, SSG for city pages |
| **Styling** | Tailwind CSS + Framer Motion | Responsive design, smooth animations |
| **Database** | Supabase (PostgreSQL) | User accounts, trips, trip_days, trip_activities |
| **Auth** | Supabase Auth (Google, email/password) | User authentication |
| **AI** | OpenAI GPT-4.1 mini + AWS Bedrock Claude 3.5 Sonnet | Multi-provider agent system |
| **Live Data** | Google Places API, OpenWeatherMap | Real-time attraction data, weather forecasts |
| **Email** | Resend | Nightly briefing HTML emails |
| **Maps** | Mapbox GL JS | Interactive city maps with attraction clusters |
| **CDN** | AWS CloudFront | Static assets (images, videos) |
| **Infrastructure** | AWS Lambda + EventBridge + S3 + OpenSearch | Serverless action groups, scheduled briefings, knowledge base (future) |
| **Deployment** | Vercel | Next.js hosting with edge functions |

### Data Architecture

**City Data (Static)**
- 220 cities × ~10 JSON files = 3,200+ files in `public/data/`
- Schema: overview, attractions, neighborhoods, culinary guide, connections, seasonal activities, visit calendar, monthly guides
- Build-time consolidation via scripts (generates `index.json` per city)
- Served via SSG (pre-rendered at build time)

**Trip Data (Dynamic)**
- Normalized schema:
  - `trips` → trip-level metadata (user, city, dates, preferences)
  - `trip_days` → one row per day (date, theme, notes)
  - `trip_activities` → granular activities (time block, location, Google Place ID, status)
- Enables efficient queries, atomic updates, and activity swap tracking

**Itinerary Generation Flow**
1. User submits preferences (dates, pace, interests, budget)
2. Server-side engine (`buildItinerary.js`) generates initial plan:
   - Filters attractions by interests
   - Distributes across days based on pace
   - Assigns time blocks (morning, lunch, afternoon, evening, night)
   - Adds transfer time estimates
3. Writes to Supabase (trips → trip_days → trip_activities)
4. Returns trip ID → redirect to `/itineraries/{tripId}`

**Agentic Refinement Flow**
1. User opens PlannerChat panel, types request
2. Client sends SSE POST to agent route (OpenAI or Bedrock)
3. Server builds context-aware prompt with trip data
4. Agent streams response, calls tools as needed:
   - `get_city_attractions` → Read city JSON
   - `get_place_details` → Google Places API
   - `search_nearby` → Google Places radius search
   - `update_itinerary` → Supabase update + SSE `activity_updated` event
5. Client updates UI optimistically, shows "AI Updated" badge

### Multi-Provider Agent System

**Why multiple providers?**
- **Cost optimization**: Claude 3.5 Sonnet ($3 input / $15 output per 1M tokens) vs GPT-4.1 mini ($0.15 / $0.60)
- **Model flexibility**: A/B test quality, switch models via env var
- **Reliability**: Automatic fallback to OpenAI if Bedrock throttles

**4 Agent Implementations**

| Provider | Route | Orchestration | Tools Run | Use Case |
|----------|-------|---------------|-----------|----------|
| OpenAI GPT-4.1 mini | `/api/plan/agent` | Your code | Next.js process | Production default |
| Bedrock Converse | `/api/plan/agent-bedrock` | Your code | Next.js process | A/B testing, cost comparison |
| Bedrock Return Control | `/api/plan/agent-bedrock-rc` | Bedrock | Next.js process | Session memory, managed orchestration |
| Bedrock InvokeAgent | `/api/plan/agent-invoke` | Bedrock | AWS Lambda | Nightly briefing (headless) |

**Routing**: Controlled by `NEXT_PUBLIC_AGENT_PROVIDER` env var. PlannerChat.js maps provider to route.

---

## Core Features

### 1. City Discovery & Content
- **220 European cities** across 39 countries with structured data
- **Rich content per city**:
  - Attractions (with ratings, duration, price range, coordinates, opening hours)
  - Neighborhoods (character, appeal, categories)
  - Culinary guide (fine dining, casual, street food, bars/cafes)
  - Transport connections
  - Seasonal activities
  - Visit calendar (day-range granularity, crowd levels, events, traveler types)
  - Monthly guides (12 per city, with weather, tourism levels, unique experiences)
- **Interactive map** with Mapbox GL (attraction clusters, filters, popups)
- **Search & filtering**: Region, country, tourism category, dates, ratings

### 2. Intelligent Itinerary Planning

**Single-City Itineraries**:
- **Preference-based generation**: Dates, pace, interests (10 categories), budget
- **Time-block scheduling**: Morning anchor, lunch, afternoon discovery, evening entertainment, night activity
- **Interest matching**: 8+ interest categories (Culture, Food, Nature, Art, Nightlife, Shopping, Photography, Family)
- **Transfer time estimates**: Simple distance-based (future: Google Maps Directions API)
- **Fallback logic**: If city data is sparse, fills gaps with generic recommendations

**Multi-City Itineraries** (NEW):
- **Route templates**: 15+ predefined routes (e.g., "Imperial Capitals: Vienna → Budapest → Prague", "Spanish Mediterranean")
- **Custom route building**: Select any cities, AI optimizes the order
- **AI-optimized routing**: Three route variants generated:
  - **Fastest**: Minimize total travel time
  - **Most Scenic**: Prioritize scenic train routes
  - **Most Budget-Friendly**: Minimize transport costs
- **Smart day allocation**: AI recommends days per city based on:
  - Attraction count matching interests
  - Trip duration and pace preference
  - Rationale explaining why (e.g., "4 days in Paris to see 45 attractions matching culture/art interests")
- **Travel day insertion**: Automatic insertion of transport days between cities with:
  - Train/flight/bus options with journey times and price ranges
  - Deep-links to booking platforms (Trainline, Omio, Skyscanner)
  - Travel tips (arrive early, pack essentials, currency changes)
- **Geographic coverage**: 220+ cities across 40+ countries
  - Same-country routes (multi-city)
  - Cross-border routes (multi-country) with visa/currency reminders

### 3. Conversational Itinerary Refinement
- **Natural language requests**: "Replace the museum with something outdoors"
- **Context-aware**: Agent knows trip dates, city, current itinerary, user interests
- **Real-time updates**: SSE streaming, optimistic UI, activity cards pulse on change
- **Tool use**: Live Google Places data (hours, ratings, photos), attraction search, database writes
- **Multi-turn conversations**: Agent maintains session state (Bedrock) or message history (OpenAI)

### 4. Timing Intelligence
- **Visit calendar**: Best dates to visit, crowd levels, events, weather patterns
- **Seasonal recommendations**: Activities specific to each season
- **Monthly guides**: Reasons to visit/reconsider, half-month breakdowns
- **Traveler type filtering**: Solo, Couple, Family, Group

### 5. Live Trip Support (Nightly Briefing)
- **Scheduled**: Daily at 7 PM UTC (EventBridge cron)
- **Proactive intelligence**:
  - Weather forecast (morning/afternoon temps, rain probability)
  - Opening hours verification for tomorrow's activities
  - Indoor alternative suggestions if bad weather
- **Delivery**: HTML email via Resend (trip city, date, weather summary, activity details)
- **Separate agent**: Different system prompt, optimized for structured output

### 6. User Accounts & Trip Persistence
- **Supabase Auth**: Google OAuth + email/password
- **Dual-mode**: Anonymous users use localStorage, authenticated users use Supabase
- **Saved items**: Wishlist for cities and experiences
- **Trip history**: Access past trips, re-use itineraries

### 7. Export & Sharing
- **PDF export**: html2pdf.js generates downloadable itinerary
- **Social sharing**: Share trip via Facebook, Twitter, WhatsApp
- **Embed maps**: Itinerary includes interactive Mapbox map

---

## What This Project Is NOT

To clarify scope boundaries:

❌ **Not a booking platform** (yet)
- No hotel/flight booking integration (future: affiliate links)
- No restaurant/tour reservations (future: provider marketplace)

❌ **Not a social network**
- No user-generated content, reviews, or trip sharing community (future consideration)

❌ **Not a navigation app**
- No turn-by-turn directions (use Google Maps integration via deep links)

❌ **Not a budget tracker**
- No expense tracking, currency conversion, or receipt scanning (future consideration)

❌ **Not a comprehensive travel encyclopedia**
- Data is curated for trip planning, not exhaustive (e.g., no detailed visa requirements, local laws, customs procedures)

---

## Geographic Scope

### Coverage

**220+ European cities** across **40+ countries**:

- **Western Europe**: France, Spain, Italy, Germany, UK, Netherlands, Belgium, Switzerland, Austria, Portugal
- **Eastern Europe**: Poland, Czech Republic, Hungary, Croatia, Greece, Romania, Bulgaria
- **Nordic Countries**: Norway, Sweden, Denmark, Finland, Iceland
- **Balkans**: Bosnia, Serbia, Albania, Montenegro, Slovenia
- **Baltic States**: Estonia, Latvia, Lithuania

### Transport Network

**2,000+ direct connections** mapped between cities:
- **Train routes**: High-speed (TGV, ICE, Renfe AVE), regional, scenic routes
- **Flight routes**: Budget carriers (Ryanair, EasyJet), full-service airlines
- **Bus routes**: FlixBus, Eurolines intercity coaches
- **Ferry routes**: Mediterranean, Baltic, North Sea crossings

### Visa & Currency Considerations

- **Schengen Zone (27 countries)**: Free movement, no border checks
  - Countries: Most of EU (France, Germany, Spain, Italy, etc.)
  - Travel within Schengen: No passport control
- **Non-Schengen EU**: Ireland, Croatia, Romania, Bulgaria (border checks required)
- **Non-EU**: UK, Switzerland, Norway, Iceland (separate visa requirements)

**Multi-country trip features**:
- Currency change notifications (€ → £ → kr, etc.)
- Border crossing reminders (Schengen vs non-Schengen)
- Travel document requirements (ID card vs passport)

---

## Target Audience

### Primary User Personas

**1. The Efficient Planner** (35-50, professional, high income)
- **Pain point**: Limited vacation time, wants to maximize experiences without wasting hours researching
- **Value**: AI-generated itinerary saves 10+ hours of planning
- **Monetization**: Pro subscription for nightly briefings, priority support

**2. The Cultural Explorer** (25-40, curious, mid income)
- **Pain point**: Generic "Top 10" lists miss hidden gems that match their interests
- **Value**: Interest-based filtering (Art, History, Food) surfaces personalized recommendations
- **Monetization**: Affiliate commissions on tours, experiences

**3. The First-Time European Traveler** (20-35, budget-conscious)
- **Pain point**: Overwhelmed by choices, unsure when to visit, what to prioritize
- **Value**: Timing intelligence (visit calendar, monthly guides) reduces decision paralysis
- **Monetization**: Freemium (basic itinerary free, Pro for briefings and unlimited trips)

**4. The Repeat Visitor** (30-55, experienced traveler)
- **Pain point**: Already seen major landmarks, wants off-the-beaten-path experiences
- **Value**: Conversational refinement ("exclude places I've visited", "find lesser-known museums")
- **Monetization**: Provider marketplace commissions (local guides, unique experiences)

### Secondary Audiences

- **Travel agencies** (B2B): License city data API for white-label trip planning tools
- **Tour operators**: Integrate nightly briefing feature into existing tours
- **Corporate travel managers**: Use for employee trip planning (business + leisure blend)

---

## Success Metrics

### User Engagement
- **Activation rate**: % of visitors who create an itinerary
- **Refinement rate**: % of users who use PlannerChat to modify itinerary
- **Completion rate**: % of users who create a trip after chatting
- **Session length**: Average messages per conversation
- **Swap rate**: Average activity swaps per trip

### Retention
- **D7 retention**: % of users who return within 7 days
- **Trip save rate**: % of itineraries saved to account
- **Briefing open rate**: % of nightly briefing emails opened (for Pro users)

### Revenue (Future)
- **Subscription conversion**: % of free users who upgrade to Pro
- **Affiliate click-through**: % of users who click booking links
- **Marketplace GMV**: Total bookings via provider marketplace

### Technical
- **Agent quality**: % of tool calls that return valid results
- **Latency (TTFT)**: Time to first token in agent responses
- **Token cost per request**: Track by provider (OpenAI vs Bedrock)
- **Fallback rate**: % of Bedrock requests that fall back to OpenAI

---

## Roadmap & Future Vision

### Completed (March 2026)
- ✅ **Multi-city & multi-country trip planner**
  - Route templates + custom route building
  - AI-optimized city sequencing (3 variants)
  - Smart day allocation with AI rationale
  - Transport integration (train/flight/bus booking links)
  - Database schema extended (cities JSONB, trip_transfers table)

### Near-Term (Q2 2026)
1. **Multi-city UI/UX** (complete frontend for route planning wizard)
2. **Deploy Bedrock Agent to AWS** (agents + action groups + knowledge base)
3. **SEO optimization** (per-city metadata, robots.txt, schema markup)
4. **Affiliate integration** (GetYourGuide for tours, Booking.com for hotels)

### Mid-Term (Q3-Q4 2026)
5. **Provider marketplace MVP** (local guides, restaurants, experiences can list offerings)
6. **Mobile app** (React Native, offline itinerary access, live navigation integration)
7. **Post-trip photo summary** (AI-generated narrative with photo-to-location matching)
8. **Stripe subscription** (Pro tier: $9-15/month for nightly briefings, unlimited trips)

### Long-Term (2027+)
9. **Multi-agent collaboration** (supervisor agent delegates to specialists: planner, weather, booking)
10. **Real-time booking** (one-click restaurant/tour reservations via provider API integrations)
11. **AR city guides** (phone camera overlay with attraction info, directions)
12. **B2B API licensing** (white-label trip planning for travel agencies, airlines)

---

## Competitive Positioning

### How EuroTrip Planner Differs from Competitors

| Competitor | Strength | EuroTrip Planner Advantage |
|------------|----------|---------------------------|
| **Lonely Planet** | Comprehensive content | ✅ **Timing intelligence** (visit calendars, seasonal data) |
| **TripAdvisor** | User reviews, booking | ✅ **Conversational refinement** (AI agent swaps activities) |
| **Google Travel** | Search integration, Maps | ✅ **Structured itineraries** (day-by-day, time blocks) |
| **Roadtrippers** | Multi-stop road trips | ✅ **City-focused depth** (220 cities with neighborhood guides) |
| **AI trip planners (Roam Around, Wonderplan)** | AI-generated itineraries | ✅ **Live trip support** (nightly briefings), **grounded tools** (real Google Places data) |

**Unique value**: **Conversational refinement + live trip intelligence** in one platform.

---

## Technical Debt & Constraints

### Known Limitations

1. **Static city data** (3,200+ JSON files)
   - Updates require redeployment
   - No real-time content updates
   - **Future**: Migrate to Supabase tables or headless CMS

2. **Hardcoded cityData.js** (2,283 lines)
   - Entire city database inlined in client bundle (~100KB)
   - **Future**: Generate from manifest.json at build time

3. **Paris-only experiences scoring**
   - Only Paris has detailed experiences file with scoring system
   - **Future**: Extend to top 20 cities

4. **Multi-city UI incomplete**
   - Backend logic complete, frontend route planner in progress
   - **Future**: Complete `/plan-multi` page with route template selector

5. **No mobile app**
   - Responsive web, but no native offline support
   - **Future**: React Native app

6. **Dual auth system**
   - NextAuth + Supabase Auth both coexist (legacy)
   - **Future**: Remove NextAuth, consolidate on Supabase

### Security Considerations

- ✅ Supabase RLS policies for user data isolation
- ✅ API keys stored in server-side env vars (never exposed to client)
- ❌ No rate limiting on AI agent routes (future: implement per-user quotas)
- ❌ No CSRF protection on trip creation (future: add CSRF tokens)

---

## Data Quality & Completeness

### City Coverage Tiers

**Tier 1 (Full data)**: ~20 cities
- Complete attractions, neighborhoods, culinary guides, monthly data, connections, seasonal activities
- Examples: Paris, Barcelona, Rome, London, Amsterdam, Berlin, Vienna, Prague
- Coverage: 8-10 JSON files per city, 2,000+ lines of curated content

**Tier 2 (Good data)**: ~100 cities
- Attractions, neighborhoods, connections, visit calendar
- Missing: Detailed culinary guides, monthly breakdowns
- Examples: Lyon, Seville, Porto, Krakow, Edinburgh, Copenhagen

**Tier 3 (Basic data)**: ~100 cities
- Attractions list, basic connections
- May rely on generic recommendations for culinary/neighborhoods
- Examples: Smaller regional capitals, secondary tourist destinations

### Known Data Issues

1. **Copy-paste contamination**: ~10 cities have Tirana data instead of their own
   - Affected cities: Hallstatt, Mostar, Kotor, Ohrid (requires regeneration)
   - Priority fix for Q2 2026

2. **Transport data completeness**: Not all city pairs have connection data
   - Mapped: ~2,000 direct connections
   - Unmapped: Long-distance routes (e.g., Lisbon → Athens)
   - Fallback: Rome2Rio link for unmapped routes

3. **Seasonal accuracy**: Monthly data may not reflect real-time events
   - Static data captured in 2024-2025
   - Future: Integrate event APIs (Eventbrite, local tourism boards)

### Improvement Priorities

1. **Fill Tier 3 cities** with detailed data (manual curation + AI generation)
2. **Build complete transport matrix** for all 220 cities
3. **Integrate real-time data sources** (event APIs, opening hours APIs)
4. **Add Google Places enrichment** for live ratings/hours (lazy loading during trip planning)

---

## Project Philosophy

### Design Principles

1. **Structured data > unstructured content**: Queryable JSON enables intelligent filtering, not just keyword search
2. **Conversational > form-based**: Natural language refinement is faster than clicking through 10 options
3. **Proactive > reactive**: Nightly briefings anticipate problems instead of waiting for users to ask
4. **Grounded tools > hallucination**: AI agent calls real APIs (Google Places, weather) instead of making up facts
5. **Progressive enhancement**: Anonymous users get core value, authenticated users get persistence and briefings

### Engineering Values

1. **Ship fast, iterate faster**: Launch with OpenAI, add Bedrock later for cost optimization
2. **Use managed services**: Supabase (DB), Vercel (hosting), Resend (email) over self-hosted
3. **Observability first**: Log every agent request (tokens, latency, tool calls) for cost/quality analysis
4. **Graceful degradation**: Bedrock fallback to OpenAI, static city data fallback to generic recommendations

---

## Conclusion

**EuroTrip Planner transforms European travel planning from a fragmented, time-consuming chore into a conversational, intelligent, and proactive experience.** By combining structured city data, AI agents, live data integrations, and nightly briefings, it delivers personalized itineraries that adapt to user preferences and trip conditions in real-time.

The project's core function is **effortless personalized trip planning**, achieved through a multi-layered system:
- **Discovery layer**: 220 cities with rich, structured content
- **Planning layer**: AI-driven itinerary generation with preference matching
- **Refinement layer**: Conversational agents with grounded tools
- **Support layer**: Proactive nightly briefings with weather and conditions

As the platform scales, it will expand from single-city trips to multi-city routes, from itinerary planning to full-service booking, and from consumer focus to B2B API licensing—becoming the definitive platform for European travel intelligence.
