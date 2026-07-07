import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { PricingPlanDialog } from "./PricingPlanDialog";
import type { PricingPlan } from "./types";

export function PricingTab() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_pricing_plans" as any);
    if (!error && data) setPlans(data as PricingPlan[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleDelete = async (planId: string) => {
    const { error } = await supabase.rpc("admin_delete_pricing_plan" as any, { _plan_id: planId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plan deleted" });
      fetchPlans();
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    if (cents === 0) return "Custom";
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Pricing Plans</CardTitle>
        <Button size="sm" onClick={() => { setEditingPlan(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Plan
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Max Docs</TableHead>
                <TableHead className="text-right">Max Users</TableHead>
                <TableHead>Highlighted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{formatPrice(plan.price_cents, plan.currency)}</TableCell>
                  <TableCell className="capitalize">{plan.period}</TableCell>
                  <TableCell className="text-right">{plan.max_documents ?? "∞"}</TableCell>
                  <TableCell className="text-right">{plan.max_users ?? "∞"}</TableCell>
                  <TableCell>
                    {plan.highlighted && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingPlan(plan); setDialogOpen(true); }}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{plan.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This pricing plan will be permanently deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(plan.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No pricing plans configured</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <PricingPlanDialog
        plan={editingPlan}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchPlans}
      />
    </Card>
  );
}
