import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import efinsignLogo from "@/assets/efinsign-logo.png";


interface PricingPlan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  period: string;
  max_documents: number | null;
  max_users: number | null;
  features: string[];
  highlighted: boolean;
  stripe_price_id: string | null;
}

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { subscription, createCheckout, refreshSubscription, isPlatformAdmin, user } = useAuth();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [orgSubActive, setOrgSubActive] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from("pricing_plans").select("*").order("sort_order").then(({ data }) => {
      if (data) {
        const filtered = data
          .map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] }))
          .filter((p: any) => p.price_cents > 0 && !/demo/i.test(p.name));
        setPlans(filtered);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) { setOrgSubActive(false); return; }
    let cancelled = false;
    (async () => {
      // Find any org the user belongs to that has an active/trialing subscription.
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);
      const orgIds = (memberships ?? []).map((m: any) => m.organization_id);
      if (orgIds.length === 0) {
        if (!cancelled) setOrgSubActive(false);
        return;
      }
      const { data: subs } = await supabase
        .from("org_subscriptions" as any)
        .select("organization_id, status")
        .in("organization_id", orgIds)
        .in("status", ["active", "trialing"])
        .limit(1);
      if (!cancelled) setOrgSubActive(!!(subs && subs.length > 0));
    })();
    return () => { cancelled = true; };
  }, [user, subscription.subscribed, location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Payment successful! Your subscription is now active.");
      refreshSubscription();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "cancelled") {
      toast.info("Checkout was cancelled. You can subscribe anytime.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refreshSubscription]);

  // Always allow the invitation-acceptance route through the gate.
  if (location.pathname.startsWith("/invite") || location.pathname.startsWith("/accept-invite")) return <>{children}</>;

  if (isPlatformAdmin) return <>{children}</>;

  if (subscription.loading || orgSubActive === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (subscription.subscribed || orgSubActive) return <>{children}</>;


  const handleStartTrial = async (priceId: string) => {
    setRedirecting(priceId);
    const url = await createCheckout(priceId);
    if (url) {
      window.location.href = url;
    } else {
      toast.error("Could not start checkout. Please try again.");
      setRedirecting(null);
    }
  };

  const formatPrice = (cents: number) => cents === 0 ? "Custom" : `$${cents / 100}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-6">
        <img src={efinsignLogo} alt="eFinSign" className="h-10 w-10 rounded-lg object-contain" />
        <h1 className="text-2xl font-display font-bold text-foreground">eFinSign</h1>
      </div>
      <div className="text-center mb-8">
        <h2 className="font-display text-xl font-semibold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Choose Your Plan
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Pick a plan and pay to activate your account.</p>
      </div>
      <div className="flex flex-wrap gap-4 max-w-5xl w-full justify-center">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col flex-1 basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(25%-0.75rem)] transition hover:shadow-lg ${
              plan.highlighted ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border/50"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-semibold text-primary-foreground">
                Most Popular
              </div>
            )}
            <CardContent className="flex flex-1 flex-col p-6 pt-8">
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="font-display text-4xl font-bold">{formatPrice(plan.price_cents)}</span>
                {plan.price_cents > 0 && <span className="text-muted-foreground text-sm">/{plan.period === "month" ? "mo" : plan.period}</span>}
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.max_documents ? `${plan.max_documents} documents` : "Unlimited documents"} · {plan.max_users ? `${plan.max_users} users` : "Unlimited users"}
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.stripe_price_id ? (
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handleStartTrial(plan.stripe_price_id!)}
                  disabled={!!redirecting}
                >
                  {redirecting === plan.stripe_price_id ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Redirecting...</>
                  ) : (
                    <><CreditCard className="h-4 w-4 mr-2" />Subscribe & Pay</>
                  )}
                </Button>
              ) : (
                <Button className="mt-6 w-full" variant="outline" asChild>
                  <a href="mailto:sales@efinsign.com">Contact Sales</a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-xs text-center text-muted-foreground">
        Secure payment via Stripe. Cancel anytime from your billing portal.
      </p>
    </div>
  );
}
