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

    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (!member) {
      return errorResponse(400, "no_organization", "User is not a member of any organization");
    }

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, mode, scopes, last_used_at, usage_count, usage_limit, created_at, revoked_at")
      .eq("organization_id", member.organization_id)
      .order("created_at", { ascending: false });

    if (error) {
      return errorResponse(500, "db_error", error.message);
    }

    return new Response(
      JSON.stringify({ data: keys || [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return handleError(err);
  }
});
