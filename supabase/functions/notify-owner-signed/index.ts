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
    const { document_id, signer_name, signer_email, fields_summary } = await req.json();

    if (!document_id || !signer_name || !signer_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get document details
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .select("title, owner_id")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get owner email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(doc.owner_id);

    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Owner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerEmail = userData.user.email;
    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Build fields summary HTML
    let fieldRows = "";
    if (fields_summary && Array.isArray(fields_summary) && fields_summary.length > 0) {
      fieldRows = fields_summary
        .map(
          (f: { type: string; value: string }) =>
            `<tr><td style="padding:6px 12px;border:1px solid #e5e7eb;text-transform:capitalize;">${f.type}</td><td style="padding:6px 12px;border:1px solid #e5e7eb;">${f.value}</td></tr>`
        )
        .join("");
    }

    const fieldsTable = fieldRows
      ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead><tr>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;">Field</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;">Value</th>
          </tr></thead>
          <tbody>${fieldRows}</tbody>
        </table>`
      : "";

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#111827;">Document Signed</h2>
        <p><strong>${signer_name}</strong> (${signer_email}) has signed <strong>${doc.title}</strong>.</p>
        <p style="color:#6b7280;font-size:14px;">Signed at: ${timestamp}</p>
        ${fieldsTable}
        <p style="margin-top:24px;color:#6b7280;font-size:13px;">— eFinSign</p>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "eFinSign <info@efinsuite.com>",
        to: [ownerEmail],
        subject: `${signer_name} signed: ${doc.title}`,
        html: htmlBody,
      }),
    });

    const emailResult = await emailRes.text();
    console.log("Resend response:", emailRes.status, emailResult);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in notify-owner-signed:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
