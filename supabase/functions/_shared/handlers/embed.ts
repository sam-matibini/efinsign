import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../cors.ts";
import { errorResponse } from "../errors.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function getSigningUrl(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const { document_id, signer_id, signer_email } = body;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  if (signer_id) {
    const { data: signer } = await supabase
      .from("document_signers")
      .select("access_token, email, name")
      .eq("id", signer_id)
      .single();

    if (!signer) return errorResponse(404, "not_found", "Signer not found");

    const { data: doc } = await supabase
      .from("documents")
      .select("organization_id")
      .eq("id", document_id)
      .single();

    if (doc?.organization_id !== ctx.organization_id) {
      return errorResponse(403, "forbidden", "Document does not belong to this organization");
    }

    const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/get-signing-pdf?token=${signer.access_token}`;

    return new Response(JSON.stringify({
      data: {
        url,
        signing_url: `${Deno.env.get("SITE_URL") || "https://www.efinsign.ca"}/sign?token=${signer.access_token}`,
        embed_url: `${Deno.env.get("SITE_URL") || "https://www.efinsign.ca"}/embed/sign?token=${signer.access_token}`,
        signer_email: signer.email,
        signer_name: signer.name,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (signer_email && document_id) {
    const { data: doc } = await supabase
      .from("documents")
      .select("organization_id")
      .eq("id", document_id)
      .single();

    if (doc?.organization_id !== ctx.organization_id) {
      return errorResponse(403, "forbidden", "Document does not belong to this organization");
    }

    const { data: signer } = await supabase
      .from("document_signers")
      .select("access_token, email, name")
      .eq("document_id", document_id)
      .eq("email", signer_email.toLowerCase().trim())
      .single();

    if (!signer) return errorResponse(404, "not_found", "Signer not found for this document");

    const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/get-signing-pdf?token=${signer.access_token}`;

    return new Response(JSON.stringify({
      data: {
        url,
        signing_url: `${Deno.env.get("SITE_URL") || "https://www.efinsign.ca"}/sign?token=${signer.access_token}`,
        embed_url: `${Deno.env.get("SITE_URL") || "https://www.efinsign.ca"}/embed/sign?token=${signer.access_token}`,
        signer_email: signer.email,
        signer_name: signer.name,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return errorResponse(400, "validation_error", "Provide signer_id or (document_id + signer_email)");
}

export async function getSigningStatus(_req: Request, params: Record<string, string>, _ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: signer } = await supabase
    .from("document_signers")
    .select("id, email, name, status, signed_at, document_id")
    .eq("access_token", params.token)
    .single();

  if (!signer) return errorResponse(404, "not_found", "Signer not found");

  const { data: doc } = await supabase
    .from("documents")
    .select("status, title")
    .eq("id", signer.document_id)
    .single();

  return new Response(JSON.stringify({
    data: {
      signer_status: signer.status,
      signed_at: signer.signed_at,
      document_status: doc?.status,
      document_title: doc?.title,
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
