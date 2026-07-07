import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Key,
  Webhook,
  Mail,
  Plug,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  FileSignature,
  Bell,
  UserPlus,
  CreditCard,
} from "lucide-react";

type ApiKey = { id: string; name: string; prefix: string; created: string };
type WebhookEntry = { id: string; url: string; events: string[] };

const EMAIL_NOTIFICATIONS = [
  {
    icon: Send,
    name: "Signing Request",
    fn: "send-signing-notifications",
    desc: "Sent to each signer when a document is shared for signature, includes a unique signing link.",
  },
  {
    icon: FileSignature,
    name: "Owner Signed Notification",
    fn: "notify-owner-signed",
    desc: "Notifies the document owner each time a signer completes their signature.",
  },
  {
    icon: CheckCircle2,
    name: "Signed Copy Delivery",
    fn: "send-signed-copy",
    desc: "Delivers the final signed PDF to all parties once the document is fully completed.",
  },
  {
    icon: Mail,
    name: "Document Share",
    fn: "share-document",
    desc: "Shares a document link via email, WhatsApp or SMS to a chosen recipient.",
  },
  {
    icon: UserPlus,
    name: "Organization Invitation",
    fn: "send-org-invitation",
    desc: "Invites a new user to join an organization with a one-time accept link.",
  },
  {
    icon: Bell,
    name: "Auth Emails",
    fn: "Lovable Auth",
    desc: "Email verification, password reset and magic link emails handled by Lovable Cloud.",
  },
];

const THIRD_PARTY = [
  { name: "Zapier", desc: "Trigger Zaps when documents are sent or signed.", status: "available" as const },
  { name: "Slack", desc: "Post notifications to a Slack channel on document events.", status: "coming-soon" as const },
  { name: "Google Drive", desc: "Save signed documents to a Google Drive folder.", status: "coming-soon" as const },
  { name: "Microsoft Teams", desc: "Send signing updates to Teams channels.", status: "coming-soon" as const },
  { name: "Dropbox", desc: "Archive completed documents in Dropbox.", status: "coming-soon" as const },
  { name: "Salesforce", desc: "Sync signed agreements to Salesforce records.", status: "coming-soon" as const },
];

const WEBHOOK_EVENTS = [
  "document.created",
  "document.sent",
  "document.viewed",
  "document.signed",
  "document.completed",
  "document.declined",
  "document.expired",
];

export function IntegrationsTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  const generateKey = () => {
    if (!newKeyName.trim()) {
      toast({ title: "Name required", description: "Give your API key a name first.", variant: "destructive" });
      return;
    }
    const prefix = "efs_live_" + Math.random().toString(36).slice(2, 10);
    setApiKeys((p) => [
      ...p,
      { id: crypto.randomUUID(), name: newKeyName, prefix, created: new Date().toISOString() },
    ]);
    setNewKeyName("");
    toast({ title: "API key created", description: "Copy and store it securely. (Demo — not yet wired to the backend.)" });
  };

  const copyKey = (prefix: string) => {
    navigator.clipboard.writeText(prefix);
    toast({ title: "Copied to clipboard" });
  };

  const addWebhook = () => {
    try {
      new URL(newWebhookUrl);
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }
    setWebhooks((p) => [
      ...p,
      { id: crypto.randomUUID(), url: newWebhookUrl, events: ["document.signed", "document.completed"] },
    ]);
    setNewWebhookUrl("");
    toast({ title: "Webhook added" });
  };

  return (
    <Tabs defaultValue="emails" className="space-y-4">
      <TabsList>
        <TabsTrigger value="emails"><Mail className="h-4 w-4 mr-2" />Email Notifications</TabsTrigger>
        <TabsTrigger value="api"><Key className="h-4 w-4 mr-2" />API Keys</TabsTrigger>
        <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-2" />Webhooks</TabsTrigger>
        <TabsTrigger value="connectors"><Plug className="h-4 w-4 mr-2" />Connectors</TabsTrigger>
      </TabsList>

      <TabsContent value="emails">
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              All transactional emails eFinSign currently sends. Delivery is powered by Resend via Lovable Cloud edge functions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {EMAIL_NOTIFICATIONS.map((n) => {
              const Icon = n.icon;
              return (
                <div key={n.fn} className="flex gap-3 rounded-lg border p-4">
                  <div className="rounded-md bg-primary/10 p-2 h-fit">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{n.name}</p>
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.desc}</p>
                    <code className="text-xs text-muted-foreground mt-1 block truncate">{n.fn}</code>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="api">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Generate keys for programmatic access to the eFinSign API. Keep them secret — treat them like passwords.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="key-name" className="sr-only">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Production server"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <Button onClick={generateKey}><Plus className="h-4 w-4 mr-2" />Generate</Button>
            </div>

            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                No API keys yet. Generate one above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{k.name}</p>
                      <code className="text-xs text-muted-foreground">{k.prefix}••••••••</code>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyKey(k.prefix)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setApiKeys((p) => p.filter((x) => x.id !== k.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Developer API endpoints are in private beta. Keys generated here are for preview purposes only.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="webhooks">
        <Card>
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Receive HTTP POST callbacks when document events happen in your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://your-app.com/webhooks/efinsign"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <Button onClick={addWebhook}><Plus className="h-4 w-4 mr-2" />Add</Button>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                No webhooks configured.
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{w.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {w.events.map((e) => (
                          <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWebhooks((p) => p.filter((x) => x.id !== w.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Available events</p>
              <div className="flex flex-wrap gap-1.5">
                {WEBHOOK_EVENTS.map((e) => (
                  <Badge key={e} variant="outline" className="font-mono text-xs">{e}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="connectors">
        <Card>
          <CardHeader>
            <CardTitle>Third-party Connectors</CardTitle>
            <CardDescription>Connect eFinSign with the tools your team already uses.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {THIRD_PARTY.map((c) => (
              <div key={c.name} className="flex items-start justify-between rounded-lg border p-4">
                <div className="flex gap-3">
                  <div className="rounded-md bg-muted p-2 h-fit">
                    <Plug className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.desc}</p>
                  </div>
                </div>
                {c.status === "available" ? (
                  <Button size="sm" variant="outline">Connect</Button>
                ) : (
                  <Badge variant="secondary">Coming soon</Badge>
                )}
              </div>
            ))}
            <div className="md:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              Some integrations may require a Business or Enterprise plan.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
