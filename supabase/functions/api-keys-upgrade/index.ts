import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsPreflight } from "../_shared/cors.ts";
import { validateSupabaseJwt } from "../_shared/auth.ts";
import { errorResponse, handleError } from "../_shared/errors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  try {
    const userId = await validateSupabaseJwt(req);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const keyId = body.key_id;

    if (!keyId) {
      return errorResponse(400, "validation_error", "key_id is required");
    }

    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (!member) {
      return errorResponse(400, "no_organization", "User is not a member of any organization");
    }

    const { data: subscription } = await supabase
      .from("org_subscriptions")
      .select("status, plan_name")
      .eq("organization_id", member.organization_id)
      .eq("status", "active")
      .single();

    if (!subscription) {
      return errorResponse(402, "no_subscription", "An active subscription is required to upgrade to production API keys");
    }

    const { data: key } = await supabase
      .from("api_keys")
      .select("id, mode")
      .eq("id", keyId)
      .eq("organization_id", member.organization_id)
      .is("revoked_at", null)
      .single();

    if (!key) {
      return errorResponse(404, "not_found", "API key not found");
    }

    if (key.mode === "production") {
      return errorResponse(400, "already_production", "Key is already in production mode");
    }

    const { error } = await supabase
      .from("api_keys")
      .update({ mode: "production", usage_limit: 10000 })
      .eq("id", keyId);

    if (error) {
      return errorResponse(500, "db_error", error.message);
    }

    return new Response(
      JSON.stringify({
        data: { success: true, mode: "production", message: "API key upgraded to production mode" },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return handleError(err);
  }
});
