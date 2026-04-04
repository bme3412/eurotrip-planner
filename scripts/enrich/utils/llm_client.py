"""
LLM client wrapper for city data enrichment.

Supports both Anthropic Claude and OpenAI GPT models.
"""

import os
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from tenacity import retry, stop_after_attempt, wait_exponential

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


@dataclass
class LLMResponse:
    """Structured response from LLM."""
    content: str
    model: str
    usage: Dict[str, int]
    parsed: Optional[Dict] = None

    def as_json(self) -> Optional[Dict]:
        """Parse content as JSON."""
        if self.parsed:
            return self.parsed
        try:
            # Try to extract JSON from markdown code blocks
            content = self.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            self.parsed = json.loads(content.strip())
            return self.parsed
        except json.JSONDecodeError:
            return None


class LLMClient:
    """
    Unified LLM client for enrichment tasks.

    Usage:
        client = LLMClient()  # Uses ANTHROPIC_API_KEY by default
        response = client.complete("Generate attractions for Paris")
        data = response.as_json()
    """

    def __init__(
        self,
        provider: str = "anthropic",
        model: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self.provider = provider.lower()

        if self.provider == "anthropic":
            if not HAS_ANTHROPIC:
                raise ImportError("anthropic package not installed. Run: pip install anthropic")
            self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
            if not self.api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")
            self.client = anthropic.Anthropic(api_key=self.api_key)
            self.model = model or "claude-sonnet-4-20250514"

        elif self.provider == "openai":
            if not HAS_OPENAI:
                raise ImportError("openai package not installed. Run: pip install openai")
            self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY not set")
            self.client = openai.OpenAI(api_key=self.api_key)
            self.model = model or "gpt-4o"

        else:
            raise ValueError(f"Unknown provider: {provider}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30)
    )
    def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        json_mode: bool = False,
    ) -> LLMResponse:
        """
        Send a completion request to the LLM.

        Args:
            prompt: The user prompt
            system: Optional system prompt
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0-1)
            json_mode: If True, request JSON output

        Returns:
            LLMResponse with content and metadata
        """
        if self.provider == "anthropic":
            return self._anthropic_complete(prompt, system, max_tokens, temperature)
        else:
            return self._openai_complete(prompt, system, max_tokens, temperature, json_mode)

    def _anthropic_complete(
        self,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float,
    ) -> LLMResponse:
        """Anthropic Claude completion."""
        messages = [{"role": "user", "content": prompt}]

        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }

        if system:
            kwargs["system"] = system

        response = self.client.messages.create(**kwargs)

        return LLMResponse(
            content=response.content[0].text,
            model=response.model,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
        )

    def _openai_complete(
        self,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float,
        json_mode: bool,
    ) -> LLMResponse:
        """OpenAI GPT completion."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }

        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = self.client.chat.completions.create(**kwargs)

        return LLMResponse(
            content=response.choices[0].message.content,
            model=response.model,
            usage={
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
            }
        )

    def generate_attractions(
        self,
        city: str,
        country: str,
        count: int = 15,
        existing: Optional[List[str]] = None,
    ) -> Optional[List[Dict]]:
        """
        Generate attractions for a city using LLM.

        Returns list of attraction dicts with name, type, description, etc.
        """
        existing_str = ""
        if existing:
            existing_str = f"\n\nAlready have these attractions (don't repeat): {', '.join(existing[:10])}"

        system = """You are a travel expert creating detailed attraction data for a European travel guide.
Generate accurate, helpful information about real places. Include a mix of:
- Major landmarks and monuments
- Museums and cultural sites
- Parks and gardens
- Historic neighborhoods
- Local markets
- Religious sites (if significant)
- Viewpoints

Output valid JSON only, no markdown."""

        prompt = f"""Generate {count} top attractions for {city}, {country}.

For each attraction provide:
- name: Official name
- type: Category (Museum, Monument, Park, Church, Market, Neighborhood, etc.)
- description: 2-3 sentences about what makes it special
- indoor: true/false
- best_time: Best time to visit (Morning, Afternoon, Evening, Any)
- price_range: Free, Budget, Moderate, or Expensive
- latitude: Approximate latitude
- longitude: Approximate longitude
- suggested_duration_hours: How long to spend (0.5-4)
{existing_str}

Return as JSON array of objects."""

        response = self.complete(prompt, system=system, temperature=0.7)
        return response.as_json()

    def generate_neighborhoods(
        self,
        city: str,
        country: str,
        count: int = 6,
    ) -> Optional[List[Dict]]:
        """Generate neighborhood data for a city."""

        system = """You are a travel expert creating neighborhood guides for a European travel guide.
Focus on areas interesting to tourists with distinct character.
Output valid JSON only, no markdown."""

        prompt = f"""Generate {count} notable neighborhoods in {city}, {country}.

For each neighborhood provide:
- name: Neighborhood name
- description: 2-3 sentences about character and atmosphere
- highlights: Array of 3-5 things to see/do there
- vibe: One of: Historic, Trendy, Artistic, Local, Upscale, Bohemian, Waterfront
- best_for: What type of traveler it suits (Foodies, History buffs, Nightlife, Families, etc.)

Return as JSON array of objects."""

        response = self.complete(prompt, system=system, temperature=0.7)
        return response.as_json()

    def generate_visit_calendar(
        self,
        city: str,
        country: str,
    ) -> Optional[Dict]:
        """Generate monthly visit calendar data."""

        system = """You are a travel expert creating seasonal visit guides for European cities.
Provide accurate information about weather, crowds, events, and best activities by month.
Output valid JSON only, no markdown."""

        prompt = f"""Generate a 12-month visit calendar for {city}, {country}.

Create an object with "months" containing data for each month (january through december).

For each month provide:
- weather: Brief weather description (temperature range, conditions)
- crowdLevel: One of: very low, low, moderate, high, very high
- pricing: One of: low season, shoulder season, peak season
- highlights: Array of 2-3 things that make this month special
- events: Array of notable events/festivals (can be empty)
- idealFor: What type of trip this month suits

Also include:
- bestMonths: Array of best months to visit
- peakSeason: Array of peak tourist months
- budgetMonths: Array of best months for budget travelers

Return as JSON object."""

        response = self.complete(prompt, system=system, temperature=0.7)
        return response.as_json()

    def generate_description(
        self,
        city: str,
        country: str,
        attractions: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Generate a city description/overview."""

        attractions_context = ""
        if attractions:
            attractions_context = f"\n\nNotable attractions include: {', '.join(attractions[:8])}"

        prompt = f"""Write a compelling 2-3 paragraph description for {city}, {country} for a travel guide.

Cover:
- What makes the city special/unique
- Its history and character
- What visitors can expect
{attractions_context}

Write in an engaging but informative style. Around 150-200 words."""

        response = self.complete(prompt, temperature=0.8)
        return response.content

    def generate_overview(
        self,
        city: str,
        country: str,
        existing_data: Optional[Dict] = None,
    ) -> Optional[Dict]:
        """
        Generate comprehensive overview section for a city.

        Returns full overview dict with city_name, brief_description, sections,
        why_visit, practical_info, seasonal_notes, best_time_to_visit, things_to_do_tiers.
        """
        # Build context from existing data
        context_parts = []
        if existing_data:
            # Get attraction names for context
            attrs = existing_data.get("attractions") or {}
            if isinstance(attrs, dict) and "sites" in attrs:
                attr_names = [a.get("name") for a in attrs["sites"][:15] if a.get("name")]
                if attr_names:
                    context_parts.append(f"Notable attractions: {', '.join(attr_names)}")

            # Get neighborhood names
            nbs = existing_data.get("neighborhoods") or {}
            if isinstance(nbs, dict) and "neighborhoods" in nbs:
                nb_names = [n.get("name") for n in nbs["neighborhoods"][:8] if n.get("name")]
                if nb_names:
                    context_parts.append(f"Neighborhoods: {', '.join(nb_names)}")

        context = "\n".join(context_parts) if context_parts else ""

        system = """You are a travel expert writing comprehensive city guide overviews for a European travel app.
Write engaging, informative content that helps travelers understand what makes each city special.
Be specific with real details - mention actual places, local customs, and practical information.
Output valid JSON only, no markdown code blocks."""

        prompt = f"""Generate a comprehensive overview section for {city}, {country}.

{f"Context about this city:{chr(10)}{context}" if context else ""}

Create a JSON object with this exact structure:

{{
  "city_name": "{city}",
  "country": "{country}",
  "brief_description": "2-3 paragraphs (200-300 words) capturing the city's essence, history, and character",
  "nickname": "A memorable epithet (e.g., 'City of Light' for Paris)",
  "region": "The administrative region/state",
  "population": {{
    "city": <number in millions>,
    "metro": <number in millions>,
    "unit": "million"
  }},
  "sections": [
    {{
      "title": "Thematic section name (e.g., 'Historic Heart', 'Cultural Scene')",
      "content": "Detailed paragraph (150-200 words) about this aspect",
      "icon": "icon name (museum, palette, restaurant, style, nature, nightlife)"
    }}
  ],
  "why_visit": {{
    "intro": "One sentence introducing why to visit",
    "highlights": [
      {{
        "title": "Highlight name",
        "content": "2-3 sentences about this highlight",
        "image": null
      }}
    ]
  }},
  "practical_info": {{
    "language": "Primary language",
    "currency": "Currency with symbol",
    "timezone": "Timezone description",
    "emergency_number": "Emergency number",
    "useful_phrases": [
      {{
        "phrase": "Local phrase",
        "pronunciation": "How to say it",
        "meaning": "English meaning"
      }}
    ],
    "transport": {{
      "airport_options": [
        {{
          "name": "Airport name (code)",
          "distance_to_center": "X km",
          "transfer_options": ["Train", "Bus", "Taxi"]
        }}
      ],
      "public_transport": "Brief description of public transport system",
      "passes": "Recommended transit passes"
    }}
  }},
  "seasonal_notes": {{
    "spring": {{
      "months": "Month range",
      "description": "Detailed paragraph about visiting in spring (100-150 words)",
      "highlights": ["5-7 spring highlights"],
      "considerations": ["3-5 things to consider"],
      "average_temperature": "X-Y°C (A-B°F)",
      "rainfall": "Description",
      "recommended": true/false
    }},
    "summer": {{ same structure }},
    "fall": {{ same structure }},
    "winter": {{ same structure }}
  }},
  "best_time_to_visit": {{
    "summary": "Comprehensive paragraph (150-200 words) summarizing when to visit",
    "quick_reference": {{
      "best_overall": "Month range",
      "best_weather": "Month range",
      "fewest_crowds": "Month range",
      "most_atmosphere": "Month range",
      "budget_friendly": "Month range"
    }}
  }},
  "things_to_do_tiers": {{
    "Must Do": [
      {{
        "activity": "Activity description",
        "optimal_time": "When to do it",
        "cost": "Free/€X"
      }}
    ],
    "Best in Summer": [ same structure ],
    "Best in Winter": [ same structure ],
    "Rainy Day Favorites": [ same structure ],
    "Local Experiences": [ same structure ]
  }}
}}

Include:
- 4 thematic sections
- 6 highlights in why_visit
- 4-5 useful phrases in the local language
- 1-2 airports with transfer options
- 4-6 activities per tier in things_to_do_tiers

Be accurate with population, timezone, and practical details."""

        response = self.complete(prompt, system=system, max_tokens=8000, temperature=0.7)
        return response.as_json()

    def generate_culinary_guide(
        self,
        city: str,
        country: str,
        existing_data: Optional[Dict] = None,
    ) -> Optional[Dict]:
        """
        Generate culinary guide section for a city.

        Returns culinaryGuide dict with restaurants, bars_and_cafes, food_experiences, seasonal_specialties.
        """
        # Get neighborhood context
        context = ""
        if existing_data:
            nbs = existing_data.get("neighborhoods") or {}
            if isinstance(nbs, dict) and "neighborhoods" in nbs:
                nb_names = [n.get("name") for n in nbs["neighborhoods"][:6] if n.get("name")]
                if nb_names:
                    context = f"Key neighborhoods: {', '.join(nb_names)}"

        system = """You are a food and travel expert creating culinary guides for European cities.
Focus on authentic local cuisine, regional specialties, and places locals actually enjoy.
Include a mix of price ranges and styles. Be specific with real restaurant types and dishes.
Output valid JSON only, no markdown code blocks."""

        prompt = f"""Generate a comprehensive culinary guide for {city}, {country}.

{f"Context: {context}" if context else ""}

Create a JSON object with this structure:

{{
  "restaurants": {{
    "fine_dining": [
      {{
        "name": "Restaurant name",
        "cuisine_type": "Cuisine style",
        "signature_dishes": ["Dish 1", "Dish 2"],
        "price_range": "€€€€",
        "atmosphere": "Description of ambiance",
        "best_time": "Lunch/Dinner/Both",
        "reservation_needed": true,
        "booking_tips": "Booking advice",
        "dress_code": "Smart casual/Formal",
        "location": "Neighborhood or area",
        "local_tips": "Insider advice"
      }}
    ],
    "casual_dining": [ same structure with 6-8 entries ],
    "street_food": [ same structure with 4-5 entries ]
  }},
  "bars_and_cafes": [
    {{
      "name": "Bar/cafe name",
      "type": "Wine Bar/Cocktail Bar/Café/Beer Hall",
      "specialty": "What they're known for",
      "price_range": "€-€€€€",
      "atmosphere": "Description",
      "location": "Neighborhood",
      "best_time": "When to visit",
      "signature_drinks": ["Drink 1", "Drink 2"],
      "hours": "Opening hours",
      "insider_tips": "Local advice"
    }}
  ],
  "food_experiences": [
    {{
      "name": "Experience name (e.g., 'Central Market Tour')",
      "type": "Food Market/Food Tour/Cooking Class/Wine Tasting",
      "description": "What the experience involves",
      "location": "Where it is",
      "best_time": "When to go",
      "duration_minutes": 120,
      "price_range": "€€",
      "highlights": ["Highlight 1", "Highlight 2"],
      "booking_tips": "How to book/access"
    }}
  ],
  "seasonal_specialties": {{
    "spring": ["Seasonal dish/ingredient 1", "Seasonal dish 2"],
    "summer": ["Seasonal dish 1", "Seasonal dish 2"],
    "fall": ["Seasonal dish 1", "Seasonal dish 2"],
    "winter": ["Seasonal dish 1", "Seasonal dish 2"]
  }}
}}

Include:
- 2-3 fine dining restaurants
- 6-8 casual dining spots
- 4-5 street food options
- 5-6 bars and cafes
- 4-5 food experiences
- 3-5 seasonal specialties per season

Focus on regional {country} cuisine and local specialties unique to {city}."""

        response = self.complete(prompt, system=system, max_tokens=6000, temperature=0.7)
        return response.as_json()

    def generate_seasonal_activities(
        self,
        city: str,
        country: str,
        existing_data: Optional[Dict] = None,
    ) -> Optional[Dict]:
        """
        Generate seasonal activities section for a city.

        Returns seasonalActivities dict with Spring, Summer, Fall, Winter activities.
        """
        # Get attraction context
        context = ""
        if existing_data:
            attrs = existing_data.get("attractions") or {}
            if isinstance(attrs, dict) and "sites" in attrs:
                attr_names = [a.get("name") for a in attrs["sites"][:10] if a.get("name")]
                if attr_names:
                    context = f"Key attractions: {', '.join(attr_names)}"

        system = """You are a travel expert creating seasonal activity guides for European cities.
Focus on activities that are genuinely better or only available in specific seasons.
Include a mix of outdoor and indoor activities, cultural events, and local traditions.
Output valid JSON only, no markdown code blocks."""

        prompt = f"""Generate seasonal activities for {city}, {country}.

{f"Context: {context}" if context else ""}

Create a JSON object with this structure:

{{
  "Spring": {{
    "activities": [
      {{
        "name": "Activity name",
        "type": "Festival/Outdoor/Cultural/Sports/Nature",
        "description": "2-3 sentences about the activity",
        "indoor": false,
        "best_time": "Morning/Afternoon/Evening/All day",
        "price_range": "Free/Budget/Moderate/Expensive",
        "seasonal_notes": "Why this is best in spring",
        "booking_tips": "How to participate/book"
      }}
    ]
  }},
  "Summer": {{
    "activities": [ same structure ]
  }},
  "Fall": {{
    "activities": [ same structure ]
  }},
  "Winter": {{
    "activities": [ same structure ]
  }}
}}

Include 5-6 activities per season with:
- Mix of indoor and outdoor activities
- Local festivals and events specific to each season
- Activities that leverage the weather (beaches in summer, Christmas markets in winter, etc.)
- Cultural activities and museum visits (especially for rainy seasons)
- Nature activities appropriate to the season
- Consider {country}'s climate zone when suggesting activities"""

        response = self.complete(prompt, system=system, max_tokens=4000, temperature=0.7)
        return response.as_json()

    def enrich_city_full(
        self,
        city: str,
        country: str,
        existing_data: Optional[Dict] = None,
    ) -> Dict:
        """
        Generate complete enrichment data for a city.

        Returns dict with attractions, neighborhoods, visitCalendar, description.
        """
        result = {}

        # Check what's missing
        existing_attractions = []
        if existing_data:
            attrs = existing_data.get("attractions") or {}
            if isinstance(attrs, dict) and "sites" in attrs:
                existing_attractions = [a.get("name") for a in attrs["sites"] if a.get("name")]
            elif isinstance(attrs, list):
                existing_attractions = [a.get("name") for a in attrs if a.get("name")]

        # Generate attractions if missing or few
        if len(existing_attractions) < 5:
            print(f"  Generating attractions...")
            attractions = self.generate_attractions(
                city, country, count=15, existing=existing_attractions
            )
            if attractions:
                result["attractions"] = {"sites": attractions}

        # Generate neighborhoods if missing
        existing_neighborhoods = []
        if existing_data:
            nbs = existing_data.get("neighborhoods") or {}
            if isinstance(nbs, dict) and "neighborhoods" in nbs:
                existing_neighborhoods = nbs["neighborhoods"]
            elif isinstance(nbs, list):
                existing_neighborhoods = nbs

        if len(existing_neighborhoods) < 3:
            print(f"  Generating neighborhoods...")
            neighborhoods = self.generate_neighborhoods(city, country)
            if neighborhoods:
                result["neighborhoods"] = {"neighborhoods": neighborhoods}

        # Generate visit calendar if missing
        existing_calendar = (existing_data.get("visitCalendar") or {}) if existing_data else {}
        if not existing_calendar.get("months"):
            print(f"  Generating visit calendar...")
            calendar = self.generate_visit_calendar(city, country)
            if calendar:
                result["visitCalendar"] = calendar

        # Generate description if missing
        existing_desc = None
        if existing_data:
            existing_desc = existing_data.get("description")
            if not existing_desc:
                overview = existing_data.get("overview") or {}
                if isinstance(overview, dict):
                    existing_desc = overview.get("brief_description")

        if not existing_desc:
            print(f"  Generating description...")
            # Use generated attractions for context
            attr_names = []
            if "attractions" in result:
                attr_names = [a.get("name") for a in result["attractions"].get("sites", [])]
            elif existing_attractions:
                attr_names = existing_attractions

            description = self.generate_description(city, country, attr_names)
            if description:
                result["description"] = description

        return result
