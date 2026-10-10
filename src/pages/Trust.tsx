import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Database, Users, FileCheck, Mail } from "lucide-react";

export default function Trust() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing" className="font-semibold text-lg text-foreground">
            eFinSign
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/landing" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground mb-4">
            <Shield className="h-3 w-3" />
            Trust & Security
          </div>
          <h1 className="text-4xl font-bold mb-3 text-foreground">
            Security, Privacy & Trust
          </h1>
          <p className="text-muted-foreground">
            This page is maintained by eFinSign to answer common security and privacy questions about
            our electronic signing platform. It describes controls currently enabled in the product and
            our operational practices. It is editable app-owned content and is not an independent
            certification or audit attestation.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-foreground" />
                Access & Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Accounts are protected by email and password authentication, with optional Google sign-in.</p>
              <p>Sessions are issued as short-lived JWTs and refreshed automatically. Password reset uses time-limited email links.</p>
              <p>Access to organization data is scoped by membership and role (admin/member). Platform administration is gated by a separate platform admin role stored in a dedicated roles table.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-foreground" />
                Data Isolation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>eFinSign is multi-tenant. Customer data is scoped to your organization and enforced server-side by row-level security policies on every table that holds tenant data.</p>
              <p>Uploaded documents are stored in a private bucket under an org/user prefix and are served via short-lived signed URLs only to authorized users or invited signers.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5 text-foreground" />
                Document Signing Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>External signer links are single-purpose tokens scoped to one document. Signed PDFs are generated server-side and stored alongside the original.</p>
              <p>Signer actions (view, sign, decline) update document status atomically via database triggers.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-foreground" />
                Subprocessors
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We rely on the following providers to operate eFinSign:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Lovable Cloud (Supabase)</strong> — application database, authentication, storage, and serverless functions.</li>
                <li><strong>Stripe</strong> — subscription billing and customer portal.</li>
                <li><strong>Resend</strong> — transactional email delivery.</li>
                <li><strong>Google AI (Gemini)</strong> — optional document summarization features.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-foreground" />
                Retention & Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Documents and signatures are retained while your organization keeps an active account. Organization admins can delete documents and templates at any time from the dashboard.</p>
              <p>To request full account or organization deletion, contact us at the address below.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-foreground" />
                Reporting a Security Issue
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>If you believe you have found a vulnerability or have a privacy concern, please email
                <a href="mailto:security@efinsign.ca" className="text-primary underline ml-1">security@efinsign.ca</a>.
                Please do not publicly disclose the issue until we have had a chance to investigate.</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          Shared responsibility: eFinSign operates the application and its controls described above.
          Customers are responsible for managing their own user access, role assignments, and the content
          they upload. This page does not constitute a regulatory compliance certification.
        </p>
      </main>
    </div>
  );
}
