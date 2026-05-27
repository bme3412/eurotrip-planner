import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./server";

function readBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function unauthenticatedResponse(message = "Sign in is required.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "You do not have access to this resource.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

function authConfigErrorResponse(error) {
  return NextResponse.json(
    {
      error: "Authentication requires Supabase server configuration.",
      reason: "supabase_unconfigured",
      ...(process.env.NODE_ENV !== "production" ? { detail: error?.message } : {}),
    },
    { status: 503 }
  );
}

export async function getRequesterFromAuthHeader(request, { required = true } = {}) {
  const token = readBearerToken(request);

  if (!token) {
    return {
      requester: null,
      response: required ? unauthenticatedResponse() : null,
    };
  }

  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user?.id) {
      return {
        requester: null,
        response: unauthenticatedResponse("Your session is invalid or has expired."),
      };
    }

    return {
      requester: {
        userId: data.user.id,
        userEmail: data.user.email || null,
      },
      response: null,
    };
  } catch (error) {
    const isConfigError = error?.message?.includes("Missing") && error?.message?.includes("environment variable");
    if (isConfigError) {
      return {
        requester: null,
        response: authConfigErrorResponse(error),
      };
    }
    throw error;
  }
}
