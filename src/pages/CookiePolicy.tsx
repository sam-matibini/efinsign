import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie } from "lucide-react";

const LAST_UPDATED = "July 11, 2026";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Cookie Policy — eFinSign</title>
        <meta name="description" content="How eFinSign uses cookies and browser storage to authenticate users and remember your preferences." />
        <link rel="canonical" href="/cookies" />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing" className="font-semibold text-lg text-foreground">
            eFinSign
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/landing" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground mb-4">
            <Cookie className="h-3 w-3" />
            Legal
          </div>
          <h1 className="text-4xl font-bold mb-3 text-foreground">
            Cookie Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">1. What Are Cookies?</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Cookies are small text files stored on your device by your browser. "Local storage" and "session storage" are similar mechanisms used by modern web applications. This policy uses "cookies" to refer to all of these.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">2. How eFinSign Uses Cookies</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We use a small number of strictly necessary cookies and browser-storage entries to operate the service:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Authentication (Supabase):</strong> stores your signed-in session token so you don't need to re-enter your password on every page. Cleared when you sign out.</li>
                <li><strong>Theme preference:</strong> remembers whether you chose light, dark, or system theme.</li>
                <li><strong>Application state:</strong> temporary UI state such as sidebar collapsed/expanded and the last organization you had selected.</li>
                <li><strong>Stripe:</strong> when you visit the checkout or customer portal, Stripe sets its own cookies for fraud prevention and session continuity. See Stripe's cookie policy for details.</li>
              </ul>
              <p>eFinSign does <strong>not</strong> use third-party advertising cookies, cross-site tracking cookies, or sell any of this information.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">3. Managing Cookies</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>You can view, block, or delete cookies through your browser settings. Blocking strictly necessary cookies will prevent you from signing in and using core parts of the application.</p>
              <p>Signing out from the app clears your authentication session immediately.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">4. Changes to this Policy</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>If we introduce new cookies (for example analytics), we will update this policy and, where required by law, request your consent before setting them.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">5. Contact</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Questions about this Cookie Policy? Email <a href="mailto:support@efin.money" className="text-primary underline">support@efin.money</a>.</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          This Cookie Policy is provided for general information and does not constitute legal advice.
        </p>
      </main>
    </div>
  );
}