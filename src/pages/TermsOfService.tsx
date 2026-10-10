import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";

const LAST_UPDATED = "July 11, 2026";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms of Service — eFinSign</title>
        <meta name="description" content="Terms and conditions governing use of the eFinSign electronic signature platform, governed by the laws of Ontario, Canada." />
        <link rel="canonical" href="/terms" />
      </Helmet>

      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing" className="font-semibold text-lg text-foreground">
            eFinSign
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/landing" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground">Cookies</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground mb-4">
            <Scale className="h-3 w-3" />
            Legal
          </div>
          <h1 className="text-4xl font-bold mb-3 text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">1. Acceptance of Terms</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>These Terms of Service ("Terms") form a binding agreement between you and eFinSign ("eFinSign", "we", "us"). By creating an account, signing a document, or otherwise using the service, you agree to these Terms and to our Privacy Policy.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">2. The Service</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>eFinSign provides a cloud-based platform to prepare, send, sign, and store electronic documents, including features such as templates, audit trails, multi-organization workspaces, and integrations. We may modify or discontinue features at any time.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">3. Accounts and Eligibility</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>You must be at least 16 years old and legally able to enter into a binding contract to use eFinSign. You are responsible for keeping your credentials confidential and for all activity under your account.</p>
              <p>Organization administrators are responsible for managing member access, roles, and the content their organization uploads.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">4. Acceptable Use</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>You agree not to: (a) upload unlawful, infringing, defamatory, or malicious content; (b) impersonate any person or entity or forge signatures; (c) interfere with the service, probe for vulnerabilities without authorization, or bypass security; (d) use the service to send spam; or (e) reverse engineer or resell the service without our written consent.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">5. Electronic Signatures</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>eFinSign facilitates electronic signatures in accordance with PIPEDA Part 2 and comparable electronic-transactions legislation. You are responsible for determining whether an electronic signature is appropriate and legally sufficient for your specific document, jurisdiction, and counterparties. Certain documents (e.g., wills, certain family-law documents) may be excluded by law.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">6. Subscriptions and Billing</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Paid plans are billed through Stripe on a recurring basis until cancelled. Fees are stated in the plan you select and are non-refundable except as required by law. You may cancel at any time from the customer portal; cancellation takes effect at the end of the current billing period.</p>
              <p>We may change pricing on prospective renewals with reasonable prior notice.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">7. Your Content</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>You retain ownership of the documents and content you upload. You grant eFinSign a limited, non-exclusive licence to host, process, transmit, and display that content solely to operate the service on your behalf.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">8. Intellectual Property</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>The eFinSign platform, brand, and software are owned by eFinSign and its licensors and are protected by copyright and other laws. These Terms do not grant you any right in our trademarks or trade dress.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">9. Third-Party Services</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>The service relies on third-party providers (see our Privacy Policy). Their terms and privacy notices apply to their portions of the service, and we are not responsible for their acts or omissions.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">10. Disclaimers</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">11. Limitation of Liability</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, eFinSign WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL. OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNTS YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">12. Indemnification</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>You agree to indemnify and hold harmless eFinSign and its personnel from claims arising from your content, your use of the service in violation of these Terms, or your violation of any law or third-party right.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">13. Termination</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>You may stop using the service at any time. We may suspend or terminate accounts that violate these Terms or that create risk for us or other users. Sections that by their nature should survive termination (ownership, disclaimers, limitation of liability, governing law) will survive.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">14. Governing Law</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict-of-laws rules. The courts of Ontario have exclusive jurisdiction over disputes arising out of or relating to these Terms, subject to any mandatory consumer-protection rules of your place of residence.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">15. Changes</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>We may update these Terms from time to time. Material changes will be communicated by email or in-app notice. Your continued use of the service after the effective date constitutes acceptance.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">16. Contact</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Questions about these Terms? Email <a href="mailto:support@efin.money" className="text-primary underline">support@efin.money</a>.</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          These Terms are provided for general information and do not constitute legal advice. Please consult qualified counsel for your specific situation.
        </p>
      </main>
    </div>
  );
}