import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: any) =>
  console.log(`[ADMIN-ORG-BILLING] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error(`Auth failed: ${userErr?.message ?? "no user"}`);
    const callerId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is platform_admin
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (!role) throw new Error("Not authorized");

    const body = await req.json().catch(() => ({}));
    const { org_id, action, subscription_id, price_id, trial_days } = body as {
      org_id: string;
      action?: "get" | "portal" | "cancel" | "checkout";
      subscription_id?: string;
      price_id?: string;
      trial_days?: number;
    };
    if (!org_id) throw new Error("org_id required");

    // Find admin members of the org
    const { data: members } = await admin
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", org_id);
    const adminIds = (members ?? []).filter((m: any) => m.role === "admin").map((m: any) => m.user_id);
    const targetIds = adminIds.length ? adminIds : (members ?? []).map((m: any) => m.user_id);

    // Resolve emails via auth admin
    const emails: string[] = [];
    for (const uid of targetIds) {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data?.user?.email) emails.push(data.user.email);
    }
    log("Org members emails", { count: emails.length });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find first customer match
    let customer: Stripe.Customer | null = null;
    for (const email of emails) {
      const list = await stripe.customers.list({ email, limit: 1 });
      if (list.data.length) {
        customer = list.data[0] as Stripe.Customer;
        break;
      }
    }

    // Handle checkout: works even without an existing customer
    if (action === "checkout") {
      if (!price_id) throw new Error("price_id required for checkout");
      const targetEmail = customer?.email || emails[0];
      if (!targetEmail) throw new Error("No admin email found for this organization");
      const origin = req.headers.get("origin") || "https://efinsign.ca";
      const session = await stripe.checkout.sessions.create({
        customer: customer?.id,
        customer_email: customer?.id ? undefined : targetEmail,
        line_items: [{ price: price_id, quantity: 1 }],
        mode: "subscription",
        subscription_data: trial_days && trial_days > 0 ? { trial_period_days: trial_days } : undefined,
        success_url: `${origin}/admin?checkout=success`,
        cancel_url: `${origin}/admin?checkout=cancel`,
        metadata: { org_id, assigned_by: callerId },
      });
      return new Response(JSON.stringify({ url: session.url, email: targetEmail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ has_customer: false, emails }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === "portal") {
      const origin = req.headers.get("origin") || "https://efinsign.ca";
      const portal = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${origin}/admin`,
      });
      return new Response(JSON.stringify({ url: portal.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "cancel" && subscription_id) {
      const canceled = await stripe.subscriptions.cancel(subscription_id);
      return new Response(JSON.stringify({ canceled: canceled.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Default: get
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 10 });
    const invoices = await stripe.invoices.list({ customer: customer.id, limit: 10 });

    const subSummary = subs.data.map((s: any) => {
      const item = s.items?.data?.[0];
      const periodEndUnix = s.current_period_end ?? item?.current_period_end;
      const price = item?.price;
      return {
        id: s.id,
        status: s.status,
        cancel_at_period_end: s.cancel_at_period_end,
        current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
        trial_end: s.trial_end ? new Date(s.trial_end * 1000).toISOString() : null,
        price_id: price?.id ?? null,
        product_id: price?.product ?? null,
        amount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        interval: price?.recurring?.interval ?? null,
      };
    });

    const invSummary = invoices.data.map((i: any) => ({
      id: i.id,
      number: i.number,
      amount_paid: i.amount_paid,
      amount_due: i.amount_due,
      currency: i.currency,
      status: i.status,
      created: new Date(i.created * 1000).toISOString(),
      hosted_invoice_url: i.hosted_invoice_url,
      invoice_pdf: i.invoice_pdf,
    }));

    return new Response(
      JSON.stringify({
        has_customer: true,
        customer: { id: customer.id, email: customer.email, name: customer.name },
        subscriptions: subSummary,
        invoices: invSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
