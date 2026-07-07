import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { AdminMetrics } from "./types";

export function MetricsChart({ metrics }: { metrics: AdminMetrics }) {
  const chartData = [
    { name: "Completed", count: metrics.documents_completed },
    { name: "Pending", count: metrics.documents_pending },
    { name: "This Month", count: metrics.documents_this_month },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Document Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
            <YAxis allowDecimals={false} className="text-xs fill-muted-foreground" />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
