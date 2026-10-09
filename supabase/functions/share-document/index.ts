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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id, method, recipient_email } = await req.json();
    if (!document_id || !method) {
      return new Response(JSON.stringify({ error: "document_id and method required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch document (RLS ensures ownership/org membership)
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (doc.status !== "completed") {
      return new Response(JSON.stringify({ error: "Document is not completed" }), {
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

    // Generate signed URL using service role (bypasses RLS on storage)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const expirySeconds = method === "email" ? 3600 : 86400; // 1h for email, 24h for link sharing
    const { data: urlData, error: urlErr } = await adminClient.storage
      .from("documents")
      .createSignedUrl(filePath, expirySeconds);

    if (urlErr || !urlData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate download link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "link") {
      return new Response(JSON.stringify({ url: urlData.signedUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "email") {
      if (!recipient_email) {
        return new Response(JSON.stringify({ error: "recipient_email required for email sharing" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "eFinSign <info@efinsuite.com>",
          to: [recipient_email],
          subject: `Document shared with you: ${doc.title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #1a1a1a;">A document has been shared with you</h2>
              <p style="color: #444; font-size: 16px;">
                <strong>${doc.title}</strong> has been shared with you by ${user.email}.
              </p>
              <a href="${urlData.signedUrl}" 
                 style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500;">
                Download Document
              </a>
              <p style="color: #888; font-size: 14px; margin-top: 24px;">
                This link expires in 1 hour. If the button doesn't work, copy and paste this link:<br/>
                <a href="${urlData.signedUrl}" style="color: #3B82F6;">${urlData.signedUrl}</a>
              </p>
            </div>
          `,
        }),
      });

      const resBody = await res.text();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Failed to send email", details: resBody }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid method. Use 'email' or 'link'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
