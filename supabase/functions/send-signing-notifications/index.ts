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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const authHeader = req.headers.get("Authorization");

    // The developer API invokes this function internally and proves it's a trusted
    // caller with a shared-secret header (the service-role key, which is never public).
    // This is checked independently of the bearer token because supabase.functions
    // .invoke() does not reliably forward the service-role key as the Authorization
    // bearer — so trusting the bearer alone would 401 API-triggered sends.
    const internalSecret = req.headers.get("x-internal-secret");
    const isServiceRole = !!internalSecret && internalSecret === serviceRoleKey;

    // Verify caller
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });

    let userId: string | undefined;
    if (!isServiceRole) {
      // External (web-app) caller: require a valid user JWT and validate it.
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.claims.sub;
    }

    const { document_id, signer_id, reminder, message } = await req.json();
    const personalMessage = typeof message === "string" ? message.trim().slice(0, 2000) : "";
    const isReminder = reminder === true;
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the service-role client for data access. The caller is already authorized
    // above (internal service-role secret, or a validated user JWT whose ownership is
    // re-checked below). An RLS-scoped anon read returns nothing for internal calls
    // and produces a false "Document not found".
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch document & verify ownership
    const { data: doc, error: docError } = await adminClient
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
    if (!isServiceRole && doc.owner_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read signers (includes access_token) with the same service-role client
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
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const messageHtml = personalMessage
      ? `<p style="color: #444; font-size: 16px;">${escapeHtml(personalMessage).replace(/\n/g, "<br/>")}</p>`
      : "";

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
          subject: isReminder
            ? `Reminder: please sign ${doc.title}`
            : `You've been invited to sign: ${doc.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #1a1a1a;">${
                isReminder
                  ? "Reminder: a document is waiting for your signature"
                  : "You've been invited to sign a document"
              }</h2>
              <p style="color: #444; font-size: 16px;">
                Hi ${signer.name},
              </p>
              <p style="color: #444; font-size: 16px;">
                ${
                  isReminder
                    ? `This is a friendly reminder to sign <strong>${doc.title}</strong>.`
                    : `You've been invited to sign <strong>${doc.title}</strong>.`
                }
              </p>
              ${messageHtml}
              ${signers.length > 1 ? `<p style="color: #666; font-size: 14px;">You are signer ${signer.signing_order || i + 1} of ${signers.length}.</p>` : ""}
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
