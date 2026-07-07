import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SubscriptionBadge() {
  const { subscription, isPlatformAdmin } = useAuth();
  const { currentOrg } = useOrganization();
  const [planName, setPlanName] = useState<string | null>(null);
  const [orgSub, setOrgSub] = useState<{ plan_name: string; source: string; status: string } | null>(null);

  useEffect(() => {
    if (!subscription.priceId) {
      setPlanName(null);
      return;
    }
    supabase
      .from("pricing_plans")
      .select("name")
      .eq("stripe_price_id", subscription.priceId)
      .maybeSingle()
      .then(({ data }) => setPlanName((data as any)?.name ?? null));
  }, [subscription.priceId]);

  useEffect(() => {
    if (!currentOrg?.id) { setOrgSub(null); return; }
    supabase
      .from("org_subscriptions" as any)
      .select("plan_name, source, status")
      .eq("organization_id", currentOrg.id)
      .maybeSingle()
      .then(({ data }) => setOrgSub((data as any) ?? null));
  }, [currentOrg?.id, subscription.subscribed]);

  if (isPlatformAdmin) {
    return <Badge className="bg-primary/10 text-primary border-primary/20">Platform Admin</Badge>;
  }

  // Stripe subscription takes priority
  if (!subscription.loading && subscription.subscribed) {
    const label = planName ?? "Subscribed";
    return (
      <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
        {subscription.trialing ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
        {label} · {subscription.trialing ? "Trial" : "Active"}
      </Badge>
    );
  }

  // Demo / admin-assigned org plan
  if (orgSub && orgSub.status === "active") {
    const isDemo = orgSub.source === "demo";
    return (
      <Badge className="gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
        <Sparkles className="h-3 w-3" />
        {orgSub.plan_name} · {isDemo ? "Demo" : "Active"}
      </Badge>
    );
  }

  return null;
}
