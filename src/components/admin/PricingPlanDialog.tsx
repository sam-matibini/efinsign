import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { PricingPlan } from "./types";

const emptyForm = {
  name: "",
  price_cents: 0,
  currency: "CAD",
  period: "month",
  max_documents: "",
  max_users: "",
  highlighted: false,
  sort_order: 0,
  features: [] as string[],
};

export function PricingPlanDialog({
  plan,
  open,
  onOpenChange,
  onSaved,
}: {
  plan: PricingPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name,
        price_cents: plan.price_cents,
        currency: plan.currency,
        period: plan.period,
        max_documents: plan.max_documents?.toString() ?? "",
        max_users: plan.max_users?.toString() ?? "",
        highlighted: plan.highlighted,
        sort_order: plan.sort_order,
        features: Array.isArray(plan.features) ? plan.features : [],
      });
    } else {
      setForm(emptyForm);
    }
  }, [plan, open]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_upsert_pricing_plan" as any, {
      _id: plan?.id ?? null,
      _name: form.name,
      _price_cents: form.price_cents,
      _currency: form.currency,
      _period: form.period,
      _max_documents: form.max_documents ? parseInt(form.max_documents) : null,
      _max_users: form.max_users ? parseInt(form.max_users) : null,
      _features: JSON.stringify(form.features),
      _highlighted: form.highlighted,
      _sort_order: form.sort_order,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: plan ? "Plan updated" : "Plan created" });
      onOpenChange(false);
      onSaved();
    }
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setForm((prev) => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
    setNewFeature("");
  };

  const removeFeature = (idx: number) => {
    setForm((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Plan" : "Add Plan"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Plan Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Price (cents)</Label>
              <Input
                type="number"
                value={form.price_cents}
                onChange={(e) => setForm((p) => ({ ...p, price_cents: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                {form.price_cents === 0 ? "Custom pricing" : `= ${(form.price_cents / 100).toFixed(2)} ${form.currency}`}
              </p>
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Period</Label>
              <Input value={form.period} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Max Documents</Label>
              <Input
                type="number"
                placeholder="∞"
                value={form.max_documents}
                onChange={(e) => setForm((p) => ({ ...p, max_documents: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Max Users</Label>
              <Input
                type="number"
                placeholder="∞"
                value={form.max_users}
                onChange={(e) => setForm((p) => ({ ...p, max_users: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.highlighted} onCheckedChange={(v) => setForm((p) => ({ ...p, highlighted: v }))} />
              <Label>Highlighted</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Features</Label>
            <div className="space-y-1">
              {form.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{f}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFeature(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add feature…"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
              />
              <Button variant="outline" size="sm" onClick={addFeature}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : plan ? "Update Plan" : "Create Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
