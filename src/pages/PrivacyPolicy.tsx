import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

const LAST_UPDATED = "July 11, 2026";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy — eFinSign</title>
        <meta name="description" content="How eFinSign collects, uses, discloses, and protects personal information under Canadian (PIPEDA) privacy law." />
        <link rel="canonical" href="/privacy" />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing" className="font-semibold text-lg" style={{ color: "#003D8F" }}>
            eFinSign
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/landing" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground">Cookies</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground mb-4">
            <Shield className="h-3 w-3" />
            Legal
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "#003D8F" }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">1. Introduction</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>eFinSign ("eFinSign", "we", "us", or "our") provides an electronic document signing platform. This Privacy Policy explains how we collect, use, disclose, and protect personal information in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable Ontario privacy legislation.</p>
              <p>By using eFinSign, you consent to the practices described in this policy.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">2. Information We Collect</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Account information:</strong> name, email address, password (hashed), organization name, and role.</p>
              <p><strong>Document content:</strong> PDFs and other files you or your signers upload, along with signatures, initials, form field values, and related metadata.</p>
              <p><strong>Signer information:</strong> names, email addresses, and IP addresses of external signers you invite.</p>
              <p><strong>Usage data:</strong> log entries, device and browser information, and basic analytics needed to operate and secure the service.</p>
              <p><strong>Billing information:</strong> processed by Stripe. We do not store full card numbers on our servers.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">3. How We Use Information</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We use personal information to: (a) provide and operate the signing platform; (b) authenticate users and secure accounts; (c) deliver signing requests, reminders, and completed documents; (d) process subscriptions and billing; (e) provide customer support; (f) prevent fraud and abuse; and (g) comply with legal obligations.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">4. Legal Basis and Consent</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We rely on your consent (given when you create an account or accept a signing invitation), the performance of our contract with you, our legitimate interests in operating a secure service, and compliance with legal obligations.</p>
              <p>You may withdraw consent at any time by contacting us, subject to legal or contractual restrictions.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">5. Disclosure and Subprocessors</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We share information only with service providers strictly necessary to operate eFinSign:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Lovable Cloud (Supabase)</strong> — database, authentication, storage, serverless functions.</li>
                <li><strong>Stripe</strong> — subscription billing and payment processing.</li>
                <li><strong>Resend</strong> — transactional email delivery.</li>
                <li><strong>Google AI (Gemini)</strong> — optional AI document summarization.</li>
              </ul>
              <p>We do not sell personal information. We may disclose information when required by law, court order, or to protect the rights, property, or safety of eFinSign, our users, or the public.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">6. International Transfers</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Some of our subprocessors may store or process data outside of Canada, including in the United States and the European Union. When information is transferred internationally, it remains subject to applicable Canadian privacy law and may also be accessible to foreign authorities under their local laws.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">7. Security</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We use administrative, technical, and physical safeguards including encryption in transit, row-level security, private storage buckets, short-lived signed URLs, and role-based access control. No method of transmission or storage is completely secure.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">8. Retention</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We retain personal information for as long as your organization keeps an active account or as required to meet legal, tax, and audit obligations. You may delete documents and templates from the dashboard, and may request full account deletion by contacting us.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">9. Your Rights</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Subject to applicable law, you may request access to, correction of, or deletion of your personal information, withdraw consent, and file a complaint with the Office of the Privacy Commissioner of Canada. To exercise these rights, contact us at the address below.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">10. Children</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>eFinSign is not intended for individuals under 16. We do not knowingly collect personal information from children.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">11. Changes to this Policy</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We may update this Privacy Policy from time to time. Material changes will be communicated by email or through the application. Continued use of the service after changes take effect constitutes acceptance of the updated policy.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">12. Contact</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Questions or requests? Email <a href="mailto:support@efin.money" className="text-primary underline">support@efin.money</a>.</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          This Privacy Policy is provided for general information and does not constitute legal advice. Please consult qualified counsel for your specific situation.
        </p>
      </main>
    </div>
  );
}