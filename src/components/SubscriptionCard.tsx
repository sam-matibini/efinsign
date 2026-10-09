import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SubscriptionCard() {
  const { subscription, openCustomerPortal } = useAuth();
  const { currentOrg } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [orgSub, setOrgSub] = useState<{ plan_name: string; source: string; status: string; activated_at: string } | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg?.id) { setOrgSub(null); return; }
    supabase
      .from("org_subscriptions" as any)
      .select("plan_name, source, status, activated_at")
      .eq("organization_id", currentOrg.id)
      .maybeSingle()
      .then(({ data }) => setOrgSub((data as any) ?? null));
  }, [currentOrg?.id, subscription.subscribed]);

  useEffect(() => {
    if (!subscription.priceId) { setPlanName(null); return; }
    supabase
      .from("pricing_plans")
      .select("name")
      .eq("stripe_price_id", subscription.priceId)
      .maybeSingle()
      .then(({ data }) => setPlanName((data as any)?.name ?? null));
  }, [subscription.priceId]);

  const handleManage = async () => {
    setLoading(true);
    const url = await openCustomerPortal();
    if (url) window.open(url, "_blank");
    else toast.error("Could not open subscription management.");
    setLoading(false);
  };

  const trialDaysLeft = subscription.trialEnd
    ? Math.max(0, Math.ceil((new Date(subscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isDemo = orgSub?.source === "demo" && orgSub?.status === "active";
  const hasOrgPlan = orgSub?.status === "active";

  return (
    <Card className="bg-card/60 border-border/50">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(planName || hasOrgPlan) && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Plan:</span>
            <Badge variant="outline" className="font-medium">
              {planName ?? orgSub?.plan_name}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Status:</span>
          {isDemo ? (
            <Badge className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
              <Sparkles className="h-3 w-3" /> Demo
            </Badge>
          ) : subscription.trialing ? (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left
            </Badge>
          ) : subscription.subscribed || hasOrgPlan ? (
            <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
        {!isDemo && subscription.subscriptionEnd && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {subscription.trialing ? "Trial ends:" : "Renews:"}
            </span>
            <span className="text-sm text-muted-foreground">
              {new Date(subscription.trialing ? subscription.trialEnd! : subscription.subscriptionEnd).toLocaleDateString()}
            </span>
          </div>
        )}
        {isDemo && orgSub?.activated_at && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Activated:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(orgSub.activated_at).toLocaleDateString()}
            </span>
          </div>
        )}
        {subscription.subscribed && (
          <Button variant="outline" onClick={handleManage} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
            Manage Subscription
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
