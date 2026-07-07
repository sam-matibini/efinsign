import { Building2, FileText, Users, PenTool, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminMetrics } from "./types";

export function MetricsCards({ metrics }: { metrics: AdminMetrics }) {
  const cards = [
    { label: "Organizations", value: metrics.total_organizations, icon: Building2, color: "text-blue-500" },
    { label: "Total Users", value: metrics.total_users, icon: Users, color: "text-emerald-500" },
    { label: "Total Documents", value: metrics.total_documents, icon: FileText, color: "text-orange-500" },
    { label: "Documents This Month", value: metrics.documents_this_month, icon: CalendarDays, color: "text-violet-500" },
    { label: "Completed", value: metrics.documents_completed, icon: CheckCircle2, color: "text-teal-500" },
    { label: "Pending", value: metrics.documents_pending, icon: Clock, color: "text-amber-500" },
    { label: "Total Signatures", value: metrics.total_signatures, icon: PenTool, color: "text-rose-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            <c.icon className={`h-5 w-5 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
