import { corsHeaders, corsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  return new Response(
    JSON.stringify({
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
