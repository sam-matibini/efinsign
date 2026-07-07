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
    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch document
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .select("title, signed_file_path, file_path, status, owner_id")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      console.error("Document not found:", docError);
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (doc.status !== "completed") {
      return new Response(JSON.stringify({ error: "Document not yet completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filePath = doc.signed_file_path || doc.file_path;
    if (!filePath) {
      return new Response(JSON.stringify({ error: "No file available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 24h signed URL
    const { data: urlData, error: urlErr } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(filePath, 86400);

    if (urlErr || !urlData?.signedUrl) {
      console.error("Failed to generate signed URL:", urlErr);
      return new Response(JSON.stringify({ error: "Failed to generate download link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all signers
    const { data: signers, error: signersErr } = await supabaseAdmin
      .from("document_signers")
      .select("id, name, email")
      .eq("document_id", document_id);

    if (signersErr || !signers?.length) {
      console.error("No signers found:", signersErr);
      return new Response(JSON.stringify({ error: "No signers found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];

      // Rate limit between sends
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1a1a1a;">Your Signed Document is Ready</h2>
          <p style="color: #444; font-size: 16px;">
            Hi ${signer.name},
          </p>
          <p style="color: #444; font-size: 16px;">
            All parties have signed <strong>${doc.title}</strong>. You can download your copy using the link below.
          </p>
          <a href="${urlData.signedUrl}" 
             style="display: inline-block; background-color: #16A34A; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500;">
            Download Signed Document
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            This link expires in 24 hours. If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${urlData.signedUrl}" style="color: #3B82F6;">${urlData.signedUrl}</a>
          </p>
          <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">— eFinSign</p>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "eFinSign <info@efinsuite.com>",
          to: [signer.email],
          subject: `Signed copy: ${doc.title}`,
          html: htmlBody,
        }),
      });

      const resBody = await res.text();
      const success = res.ok;
      results.push({ email: signer.email, success, ...(success ? {} : { error: resBody }) });
    }

    // Send owner completion email
    const signerEmails = new Set(signers.map(s => s.email.toLowerCase()));
    const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(doc.owner_id);
    const ownerEmail = ownerData?.user?.email;

    if (ownerEmail && !signerEmails.has(ownerEmail.toLowerCase())) {
      const signerList = signers
        .map(s => `<li><strong>${s.name}</strong> (${s.email})</li>`)
        .join("");

      const ownerHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1a1a1a;">All Parties Have Signed</h2>
          <p style="color: #444; font-size: 16px;">
            Great news! All signers have completed <strong>${doc.title}</strong>.
          </p>
          <p style="color: #444; font-size: 16px;">Signed by:</p>
          <ul style="color: #444; font-size: 15px;">${signerList}</ul>
          <a href="${urlData.signedUrl}" 
             style="display: inline-block; background-color: #16A34A; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500;">
            Download Signed Document
          </a>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            This link expires in 24 hours.<br/>
            <a href="${urlData.signedUrl}" style="color: #3B82F6;">${urlData.signedUrl}</a>
          </p>
          <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">— eFinSign</p>
        </div>
      `;

      const ownerRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "eFinSign <info@efinsuite.com>",
          to: [ownerEmail],
          subject: `All parties signed: ${doc.title}`,
          html: ownerHtml,
        }),
      });

      const ownerResBody = await ownerRes.text();
      results.push({ email: ownerEmail, success: ownerRes.ok, ...(ownerRes.ok ? {} : { error: ownerResBody }) });
    }

    console.log("Send-signed-copy results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in send-signed-copy:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
