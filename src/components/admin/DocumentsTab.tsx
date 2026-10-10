import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Upload, FileText, AlertTriangle, Shield, Users, TrendingUp,
  BarChart3, CheckCircle2, Clock, Sparkles,
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

interface DocumentAnalysis {
  summary: string;
  document_type: string;
  key_clauses: { title: string; description: string }[];
  risks: { level: string; title: string; description: string }[];
  parties: string[];
}

interface DocAnalytics {
  by_status: Record<string, number>;
  avg_signers: number;
  completion_rate: number;
  top_organizations: { org_name: string; doc_count: number }[];
  monthly_trend: { month: string; doc_count: number }[];
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210 60% 55%)",
  "hsl(30 80% 55%)",
  "hsl(340 65% 55%)",
];

export function DocumentsTab() {
  const [analytics, setAnalytics] = useState<DocAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    const { data, error } = await supabase.rpc("admin_get_document_analytics" as any);
    if (!error && data) setAnalytics(data as DocAnalytics);
    setLoadingAnalytics(false);
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    return pages.join("\n\n");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const text = await extractTextFromPdf(file);
      if (text.trim().length < 20) {
        toast({ title: "Could not extract text", description: "The PDF may be image-based or empty.", variant: "destructive" });
        setAnalyzing(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("analyze-document", { body: { text } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as DocumentAnalysis);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColor = (level: string) => {
    if (level === "high") return "destructive";
    if (level === "medium") return "secondary";
    return "outline";
  };

  const statusData = analytics?.by_status
    ? Object.entries(analytics.by_status).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-8">
      {/* AI Document Analyzer */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">AI Document Analyzer</h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {fileName ? fileName : "Click or drag a PDF to analyze"}
              </p>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </div>
          </CardContent>
        </Card>

        {analyzing && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Document Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Type</span>
                    <p className="font-medium text-sm">{analysis.document_type}</p>
                  </div>
                  {analysis.parties?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Parties</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.parties.map((p, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {analysis.key_clauses?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Key Clauses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.key_clauses.map((c, i) => (
                      <div key={i} className="border-l-2 border-primary pl-3">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis.risks?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> Identified Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.risks.map((r, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <Badge variant={riskColor(r.level) as any} className="text-xs shrink-0 mt-0.5">
                          {r.level}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Platform Document Analytics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Platform Document Analytics</h2>
        </div>

        {loadingAnalytics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : analytics ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analytics.completion_rate}%</p>
                  <Progress value={Number(analytics.completion_rate)} className="mt-2 h-2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Signers / Doc</CardTitle>
                  <Users className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analytics.avg_signers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Statuses</CardTitle>
                  <Clock className="h-5 w-5 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {statusData.map((s) => (
                      <Badge key={s.name} variant="secondary" className="text-xs">
                        {s.name}: {s.value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documents by Status</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Monthly Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.monthly_trend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                      <YAxis allowDecimals={false} className="text-xs fill-muted-foreground" />
                      <Tooltip />
                      <Line type="monotone" dataKey="doc_count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top orgs */}
            {analytics.top_organizations?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Organizations by Document Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead className="text-right">Documents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.top_organizations.map((org, i) => (
                        <TableRow key={i}>
                          <TableCell>{org.org_name}</TableCell>
                          <TableCell className="text-right font-medium">{org.doc_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">No analytics data available.</p>
        )}
      </div>
    </div>
  );
}
