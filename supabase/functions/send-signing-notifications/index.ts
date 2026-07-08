import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Verify caller
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { document_id, signer_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch document & verify ownership
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (doc.owner_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read signers (includes access_token)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let { data: signers, error: signersError } = await adminClient
      .from("document_signers")
      .select("*")
      .eq("document_id", document_id)
      .order("signing_order");

    if (signersError || !signers?.length) {
      return new Response(JSON.stringify({ error: "No signers found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to single signer if signer_id provided
    if (signer_id) {
      signers = signers.filter((s) => s.id === signer_id);
      if (!signers.length) {
        return new Response(JSON.stringify({ error: "Signer not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const siteUrl = "https://www.efinsign.ca";
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];

      // Rate limit: wait 500ms between sends to avoid Resend 429 errors
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const signingLink = `${siteUrl}/sign?token=${signer.access_token}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "eFinSign <info@efinsuite.com>",
          to: [signer.email],
          subject: `You've been invited to sign: ${doc.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #1a1a1a;">You've been invited to sign a document</h2>
              <p style="color: #444; font-size: 16px;">
                Hi ${signer.name},
              </p>
              <p style="color: #444; font-size: 16px;">
                You've been invited to sign <strong>${doc.title}</strong>.
              </p>
              <a href="${signingLink}" 
                 style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500;">
                Review & Sign Document
              </a>
              <p style="color: #888; font-size: 14px; margin-top: 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${signingLink}" style="color: #3B82F6;">${signingLink}</a>
              </p>
            </div>
          `,
        }),
      });

      const resBody = await res.text();
      const success = res.ok;
      results.push({ email: signer.email, success, ...(success ? {} : { error: resBody }) });

      // Log notification to email_notifications table
      await adminClient.from("email_notifications").insert({
        document_id,
        signer_id: signer.id,
        email: signer.email,
        status: success ? "sent" : "failed",
        error_message: success ? null : resBody,
      });
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
