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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify the caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { organization_id, email, role, origin } = await req.json();

    if (!organization_id || !email) {
      return new Response(JSON.stringify({ error: "organization_id and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS for creating invitation
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin of the org
    const { data: isAdmin } = await adminClient.rpc("has_org_role", {
      _user_id: userId,
      _org_id: organization_id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seat-limit enforcement based on the org's active subscription plan (if any).
    // Orgs without an active subscription are not blocked here — they're handled
    // by the existing subscription gate elsewhere in the app.
    const { data: sub } = await adminClient
      .from("org_subscriptions")
      .select("plan_id, status, pricing_plans(max_users, name)")
      .eq("organization_id", organization_id)
      .eq("status", "active")
      .maybeSingle();

    // @ts-ignore nested select typing
    const maxUsers: number | null = sub?.pricing_plans?.max_users ?? null;
    if (sub && maxUsers !== null) {
      const [{ count: memberCount }, { count: pendingCount }] = await Promise.all([
        adminClient
          .from("organization_members")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", organization_id),
        adminClient
          .from("org_invitations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization_id)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString()),
      ]);

      const used = (memberCount ?? 0) + (pendingCount ?? 0);
      if (used >= maxUsers) {
        return new Response(
          JSON.stringify({
            error: `Seat limit reached (${used}/${maxUsers}). Upgrade your plan to invite more members.`,
            code: "seat_limit",
            max_users: maxUsers,
            used,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


    const normalizedEmail = email.toLowerCase();

    // Look for an existing row (unique constraint is org_id + email)
    const { data: existingInvite } = await adminClient
      .from("org_invitations")
      .select("id, status, expires_at, token")
      .eq("organization_id", organization_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    let invitation: any = null;
    let resent = false;

    if (existingInvite?.status === "pending") {
      // Refresh expiry and reuse the same token — this is effectively a resend.
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: updated, error: updErr } = await adminClient
        .from("org_invitations")
        .update({ expires_at: newExpiry, role: role || "viewer", invited_by: userId })
        .eq("id", existingInvite.id)
        .select()
        .single();
      if (updErr) {
        console.error("Update invite error:", updErr);
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invitation = updated;
      resent = true;
    } else {
      // Remove stale (expired/accepted/cancelled) row to avoid unique-constraint collision
      if (existingInvite) {
        const { error: delErr } = await adminClient
          .from("org_invitations")
          .delete()
          .eq("id", existingInvite.id);
        if (delErr) {
          console.error("Delete stale invite error:", delErr);
          return new Response(JSON.stringify({ error: delErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: inserted, error: insertError } = await adminClient
        .from("org_invitations")
        .insert({
          organization_id,
          email: normalizedEmail,
          role: role || "viewer",
          invited_by: userId,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invitation = inserted;
    }

    // Get org name for the email
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const inviteLink = `${origin || "https://efinsign.com"}/invite?token=${invitation.token}`;

    // Send email via Resend if API key is configured
    if (resendApiKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "eFinSign <info@efinsuite.com>",
          to: [email],
          subject: `You've been invited to join ${org?.name || "an organization"} on eFinSign`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2>You're invited!</h2>
              <p>You've been invited to join <strong>${org?.name || "an organization"}</strong> on eFinSign as a <strong>${role || "viewer"}</strong>.</p>
              <p><a href="${inviteLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Accept Invitation</a></p>
              <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error("Resend error:", errBody);
      }
    } else {
      console.log("RESEND_API_KEY not set, skipping email. Invite link:", inviteLink);
    }

    return new Response(JSON.stringify({ success: true, invitation_id: invitation.id, resent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
