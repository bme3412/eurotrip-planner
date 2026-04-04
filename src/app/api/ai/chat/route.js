"use server";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCityData } from "@/lib/data-utils";
import { buildParisRecommendations } from "@/lib/planning/buildParisRecommendations.js";

const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MAX_RETRIES = 2;

const PLAN_SCHEMA = {
  name: "ParisTripPlan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "book_immediately", "days"],
    properties: {
      summary: { type: "string" },
      notes_for_humans: { type: "array", items: { type: "string" }, default: [] },
      book_immediately: {
        type: "array",
        default: [],
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "title"],
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            id: { type: "string" },
            note: { type: "string" },
            url: { type: "string" },
          },
        },
      },
      days: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "theme", "morning", "afternoon", "evening"],
          properties: {
            date: { type: "string" },
            theme: { type: "string" },
            pacing_note: { type: "string" },
            morning: {
              type: "array",
              items: { $ref: "#/$defs/activity" },
              default: [],
            },
            afternoon: {
              type: "array",
              items: { $ref: "#/$defs/activity" },
              default: [],
            },
            evening: {
              type: "array",
              items: { $ref: "#/$defs/activity" },
              default: [],
            },
            tips: { type: "array", items: { type: "string" }, default: [] },
            map_points: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["lat", "lng", "label"],
                properties: {
                  lat: { type: "number" },
                  lng: { type: "number" },
                  label: { type: "string" },
                },
              },
              default: [],
            },
          },
        },
      },
    },
    $defs: {
      activity: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          duration_min: { type: "number" },
          best_time: { type: "string" },
          why_it_matters: { type: "string" },
        },
      },
    },
  },
};

/**
 * Lazily create the OpenAI client so that builds don't fail when
 * OPENAI_API_KEY isn't set in the environment.
 *
 * Next.js will execute this module during build when collecting page
 * data, so we must avoid constructing the client at import time –
 * the OpenAI SDK throws immediately if apiKey is missing.
 */
let openaiClient = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // We intentionally don't throw a low–level OpenAI error here.
    // The POST handler already checks for the env var and returns
    // a clean JSON error; this guard simply protects build time.
    throw new Error("OPENAI_API_KEY is not set in the environment");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

function sanitizeTrip(input) {
  if (!input || typeof input !== "object") return null;
  if (input.trip && typeof input.trip === "object") return input.trip;
  return input;
}

function buildPlanningContext(trip, cityData) {
  const overview = cityData?.overview?.brief_description || cityData?.overview?.description || "";

  const planDraft = buildParisRecommendations(trip, cityData);

  const interestBuckets = planDraft.interests.map((bucket) => ({
    interest: bucket.interest,
    sample_options: bucket.items.slice(0, 6).map((item) => ({
      name: item.name,
      kind: item.kind,
      subtitle: item.subtitle,
      description: item.description,
      best_time: item.bestTime,
      location: item.location,
    })),
  }));

  const seasonal = Array.isArray(cityData?.monthly?.[trip.month ?? ""]) ? cityData.monthly[trip.month] : cityData?.seasonal;

  return {
    overview,
    hotel_location: trip.hotel_location,
    interest_buckets: interestBuckets,
    book_immediately: planDraft.bookImmediately,
    seasonal_highlights: seasonal,
    travel_style: planDraft.travelStyle,
  };
}

function formatPrompt({ trip, context }) {
  return [
    {
      role: "system",
      content:
        "You are an expert Paris trip-planning assistant. Produce detailed yet concise daily itineraries that balance pacing, geographic flow, and user interests. Always respect the JSON schema and avoid commentary outside of JSON. Assume the plan will seed emails and map views later.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: [
            "Craft a Paris itinerary using the provided traveler preferences and city context.",
            "Guidelines:",
            "- Respect the trip dates and length. If no end date, plan for 3 days.",
            "- Lean into the travel style when deciding pacing and downtime.",
            "- Prioritize interest buckets but keep variety (mix icons with hidden gems).",
            "- Morning slots should start near the hotel when possible.",
            "- Provide map points only for anchor activities with known coordinates.",
            "- Include at least one food or nightlife option per day, aligned with interests.",
            "- Flag limited-availability items in book_immediately.",
            "",
            "Traveler payload:",
            JSON.stringify(trip, null, 2),
            "",
            "City planning context:",
            JSON.stringify(context, null, 2),
          ].join("\n"),
        },
      ],
    },
  ];
}

async function callOpenAI(messages, attempt = 0) {
  try {
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.4,
      response_format: { type: "json_schema", json_schema: PLAN_SCHEMA },
      messages,
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI returned an empty response.");
    }

    return JSON.parse(raw);
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const backoff = Math.pow(2, attempt) * 200;
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return callOpenAI(messages, attempt + 1);
    }
    throw error;
  }
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let payload;
  try {
    payload = sanitizeTrip(await request.json());
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload) {
    return NextResponse.json({ error: "Missing trip payload." }, { status: 400 });
  }

  try {
    const cityData = await getCityData("paris");
    if (!cityData) {
      return NextResponse.json({ error: "Paris data is unavailable." }, { status: 500 });
    }

    const context = buildPlanningContext(payload, cityData);
    const messages = formatPrompt({ trip: payload, context });

    const plan = await callOpenAI(messages);

    return NextResponse.json({ plan }, { status: 200 });
  } catch (error) {
    console.error("Failed to generate AI itinerary", error);
    return NextResponse.json(
      {
        error: "Unable to generate itinerary at this time.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

