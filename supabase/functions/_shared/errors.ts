import { corsHeaders } from "./cors.ts";

export function errorResponse(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

export function handleError(err: unknown): Response {
  const message = err instanceof Error ? err.message : "Internal server error";

  if (message.includes("Missing") || message.includes("Invalid") || message.includes("revoked") || message.includes("format")) {
    return errorResponse(401, "unauthorized", message);
  }
  if (message.includes("scope")) {
    return errorResponse(403, "forbidden", message);
  }
  if (message.includes("exceeded")) {
    return errorResponse(429, "rate_limited", message);
  }

  return errorResponse(500, "internal_error", message);
}
