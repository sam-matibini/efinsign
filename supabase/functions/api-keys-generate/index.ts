import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsPreflight } from "../_shared/cors.ts";
import { validateSupabaseJwt, generateApiKey, hashKey } from "../_shared/auth.ts";
import { errorResponse, handleError } from "../_shared/errors.ts";

const VALID_SCOPES = [
  "documents:read",
  "documents:write",
  "signing:send",
  "webhooks:manage",
  "org:read",
  "org:write",
  "clients:read",
  "clients:write",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  try {
    const userId = await validateSupabaseJwt(req);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const name = (body.name || "").trim();
    const requestedScopes: string[] = Array.isArray(body.scopes) ? body.scopes : [];

    if (!name) {
      return errorResponse(400, "validation_error", "name is required");
    }

    const scopes = requestedScopes.filter((s) => VALID_SCOPES.includes(s));
    if (scopes.length === 0) {
      return errorResponse(400, "validation_error", "at least one valid scope is required");
    }

    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (!member) {
      return errorResponse(400, "no_organization", "User is not a member of any organization");
    }

    const rawKey = generateApiKey("sandbox");
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 16);

    const { error: insertErr } = await supabase
      .from("api_keys")
      .insert({
        organization_id: member.organization_id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        mode: "sandbox",
        scopes,
        created_by: userId,
      });

    if (insertErr) {
      return errorResponse(500, "db_error", insertErr.message);
    }

    return new Response(
      JSON.stringify({
        data: {
          key: rawKey,
          name,
          mode: "sandbox",
          scopes,
          message: "Store this key securely. It will not be shown again.",
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return handleError(err);
  }
});
