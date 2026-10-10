import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CreditCard, ExternalLink, Loader2, XCircle, Zap } from "lucide-react";
import type { OrgDetail, PricingPlan } from "./types";

interface BillingData {
  has_customer: boolean;
  emails?: string[];
  customer?: { id: string; email: string | null; name: string | null };
  subscriptions?: Array<{
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    trial_end: string | null;
    price_id: string | null;
    amount: number | null;
    currency: string | null;
    interval: string | null;
  }>;
  invoices?: Array<{
    id: string;
    number: string | null;
    amount_paid: number;
    currency: string;
    status: string;
    created: string;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
  }>;
}

export function OrgDetailDialog({
  orgId,
  open,
  onOpenChange,
  onSaved,
}: {
  orgId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingAction, setBillingAction] = useState<string | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [withTrial, setWithTrial] = useState(false);
  const [orgSub, setOrgSub] = useState<{ plan_name: string; source: string; status: string; activated_at: string } | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", address: "", city: "", postal_code: "", country: "", telephone: "",
  });

  const loadOrgSub = async (id: string) => {
    const { data } = await supabase
      .from("org_subscriptions" as any)
      .select("plan_name, source, status, activated_at")
      .eq("organization_id", id)
      .maybeSingle();
    setOrgSub((data as any) ?? null);
  };

  const loadBilling = async (id: string) => {
    setBillingLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-org-billing", {
      body: { org_id: id, action: "get" },
    });
    if (error) {
      toast({ title: "Could not load billing", description: error.message, variant: "destructive" });
      setBilling(null);
    } else {
      setBilling(data as BillingData);
    }
    setBillingLoading(false);
  };

  useEffect(() => {
    if (!orgId || !open) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("admin_get_organization_detail" as any, { _org_id: orgId });
      if (!error && data) {
        const d = data as unknown as OrgDetail;
        setDetail(d);
        setForm({
          name: d.org.name || "",
          email: d.org.email || "",
          address: d.org.address || "",
          city: d.org.city || "",
          postal_code: d.org.postal_code || "",
          country: d.org.country || "",
          telephone: d.org.telephone || "",
        });
      }
      setLoading(false);
      loadBilling(orgId);
      loadOrgSub(orgId);
      // Load pricing plans for assignment
      const { data: planRows } = await supabase.rpc("admin_list_pricing_plans" as any);
      if (planRows) setPlans(planRows as PricingPlan[]);
    })();
  }, [orgId, open]);

  const handleAssignPlan = async () => {
    if (!orgId || !selectedPlanId) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;
    const isDemo = plan.price_cents === 0 || /demo/i.test(plan.name);
    const { error: subErr } = await supabase.rpc("admin_assign_org_plan" as any, {
      _org_id: orgId,
      _plan_id: plan.id,
      _plan_name: plan.name,
      _source: isDemo ? "demo" : "manual",
    });
    if (subErr) {
      toast({ title: "Could not assign plan", description: subErr.message, variant: "destructive" });
    } else {
      toast({
        title: "Plan assigned",
        description: `"${plan.name}" is now active for this organization${isDemo ? " (demo)" : " (manual — no Stripe billing)"}.`,
      });
      loadBilling(orgId);
      loadOrgSub(orgId);
    }
  };

  const handleSendCheckout = async () => {
    if (!orgId || !selectedPlanId) return;
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;
    const stripePriceId = (plan as any).stripe_price_id;
    if (!stripePriceId) {
      toast({ title: "No Stripe price configured", description: `Set a Stripe price for "${plan.name}" in the Pricing tab first.`, variant: "destructive" });
      return;
    }
    setBillingAction("checkout");
    const { data, error } = await supabase.functions.invoke("admin-org-billing", {
      body: { org_id: orgId, action: "checkout", price_id: stripePriceId, trial_days: withTrial ? 7 : 0 },
    });
    setBillingAction(null);
    if (error || !data?.url) {
      toast({ title: "Could not start checkout", description: error?.message, variant: "destructive" });
    } else {
      window.open(data.url, "_blank");
      toast({ title: "Checkout opened", description: `Sent to ${data.email}. Once paid, the subscription will appear below.` });
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_update_organization" as any, {
      _org_id: orgId,
      _name: form.name,
      _email: form.email,
      _address: form.address,
      _city: form.city,
      _postal_code: form.postal_code,
      _country: form.country,
      _telephone: form.telephone,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organization updated" });
      onSaved();
    }
  };

  const handleOpenPortal = async () => {
    if (!orgId) return;
    setBillingAction("portal");
    const { data, error } = await supabase.functions.invoke("admin-org-billing", {
      body: { org_id: orgId, action: "portal" },
    });
    setBillingAction(null);
    if (error || !data?.url) {
      toast({ title: "Could not open billing portal", description: error?.message, variant: "destructive" });
    } else {
      window.open(data.url, "_blank");
    }
  };

  const handleCancelSub = async (subscriptionId: string) => {
    if (!orgId) return;
    if (!confirm("Cancel this subscription immediately?")) return;
    setBillingAction(subscriptionId);
    const { error } = await supabase.functions.invoke("admin-org-billing", {
      body: { org_id: orgId, action: "cancel", subscription_id: subscriptionId },
    });
    setBillingAction(null);
    if (error) {
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Subscription canceled" });
      loadBilling(orgId);
    }
  };

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "postal_code", label: "Postal Code" },
    { key: "country", label: "Country" },
    { key: "telephone", label: "Telephone" },
  ];

  const fmtMoney = (cents: number | null, currency: string | null) =>
    cents == null ? "—" : `${(cents / 100).toFixed(2)} ${(currency || "").toUpperCase()}`;

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "active" || status === "trialing" || status === "paid") return "default";
    if (status === "canceled" || status === "unpaid" || status === "past_due") return "destructive";
    return "secondary";
  };

  const activeSub = billing?.subscriptions?.find((s) => s.status === "active" || s.status === "trialing");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Organization Details
            {activeSub && (
              <Badge variant={statusVariant(activeSub.status)} className="ml-2">
                {activeSub.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-muted-foreground">Loading…</p>}

        {detail && (
          <div className="space-y-6">
            {/* Currently assigned plan */}
            <div className="rounded-lg border p-4 flex flex-wrap items-center gap-3 bg-muted/30">
              <span className="text-sm font-semibold">Assigned plan:</span>
              {orgSub && orgSub.status === "active" ? (
                <>
                  <Badge variant="outline" className="font-medium">{orgSub.plan_name}</Badge>
                  {orgSub.source === "demo" ? (
                    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Demo</Badge>
                  ) : orgSub.source === "manual" ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">Manual</Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Activated {format(new Date(orgSub.activated_at), "MMM d, yyyy")}
                  </span>
                </>
              ) : (
                <Badge variant="secondary">No plan assigned</Badge>
              )}
            </div>

            {/* Subscription & Billing */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Subscription & Billing
                </h3>
                {billing?.has_customer && (
                  <Button size="sm" variant="outline" onClick={handleOpenPortal} disabled={billingAction === "portal"}>
                    {billingAction === "portal" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><ExternalLink className="h-4 w-4 mr-1" /> Manage in Stripe</>
                    )}
                  </Button>
                )}
              </div>

              {billingLoading && <p className="text-sm text-muted-foreground">Loading billing…</p>}

              {!billingLoading && !billing?.has_customer && (
                <p className="text-sm text-muted-foreground">
                  No Stripe customer linked to this organization's admin email{billing?.emails?.length ? ` (${billing.emails.join(", ")})` : ""}.
                </p>
              )}

              {!billingLoading && billing?.has_customer && (
                <>
                  <div className="text-xs text-muted-foreground">
                    Customer: <span className="font-mono">{billing.customer?.email}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Subscriptions</h4>
                    {billing.subscriptions && billing.subscriptions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Period End</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billing.subscriptions.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>
                                <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                                {s.cancel_at_period_end && (
                                  <span className="ml-2 text-xs text-muted-foreground">cancels at period end</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {fmtMoney(s.amount, s.currency)}{s.interval ? `/${s.interval}` : ""}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {s.current_period_end ? format(new Date(s.current_period_end), "MMM d, yyyy") : "—"}
                              </TableCell>
                              <TableCell>
                                {(s.status === "active" || s.status === "trialing") && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCancelSub(s.id)}
                                    disabled={billingAction === s.id}
                                  >
                                    {billingAction === s.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <><XCircle className="h-4 w-4 mr-1" /> Cancel</>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">No subscriptions.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Recent Invoices</h4>
                    {billing.invoices && billing.invoices.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Number</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billing.invoices.map((i) => (
                            <TableRow key={i.id}>
                              <TableCell className="text-sm">{format(new Date(i.created), "MMM d, yyyy")}</TableCell>
                              <TableCell className="font-mono text-xs">{i.number || "—"}</TableCell>
                              <TableCell>{fmtMoney(i.amount_paid, i.currency)}</TableCell>
                              <TableCell><Badge variant={statusVariant(i.status)}>{i.status}</Badge></TableCell>
                              <TableCell>
                                {i.hosted_invoice_url && (
                                  <a href={i.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-primary text-sm inline-flex items-center gap-1">
                                    View <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">No invoices yet.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Assign Subscription Plan */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" /> Assign Subscription Plan
              </h3>
              <p className="text-xs text-muted-foreground">
                Assign any plan directly — it activates immediately for the organization with no payment required. Optionally also send the org admin to Stripe checkout for paid plans.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Plan</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger><SelectValue placeholder="Select a plan…" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => {
                        const isDemo = p.price_cents === 0 || /demo/i.test(p.name);
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {(p.price_cents / 100).toFixed(2)} {p.currency}/{p.period}
                            {isDemo ? " (demo)" : !(p as any).stripe_price_id ? " (no Stripe price)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={withTrial} onCheckedChange={(c) => setWithTrial(!!c)} />
                  7-day trial
                </label>
                <Button onClick={handleAssignPlan} disabled={!selectedPlanId}>
                  Assign directly
                </Button>
                <Button variant="outline" onClick={handleSendCheckout} disabled={!selectedPlanId || billingAction === "checkout"}>
                  {billingAction === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Stripe checkout"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}</Label>
                  <Input
                    value={form[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>

            <div>
              <h3 className="text-sm font-semibold mb-2">Members ({detail.members.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.members.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">{m.full_name || "Unknown"}</TableCell>
                      <TableCell><Badge variant="secondary">{m.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(m.joined_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {detail.members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No members</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
