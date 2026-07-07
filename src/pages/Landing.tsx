/* eFinSign Landing Page */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
const efinsignLogo = "/images/efinsign-logo.png";
const heroPaperless = "/images/hero-paperless.png";
const featureSecureSignatures = "/images/feature-secure-signatures.png";
const featureMultiOrg = "/images/feature-multi-org.png";
const featureTemplates = "/images/feature-templates.png";
const featureAuditTrail = "/images/feature-audit-trail.png";
const featureCollaboration = "/images/feature-collaboration.png";
const featureCloudStorage = "/images/feature-cloud-storage.png";
const featureBilling = "/images/feature-billing.png";
const featureAiAssistant = "/images/feature-ai-assistant.png";
import {
  Shield, Users, ClipboardCheck, Cloud, CreditCard,
  Bot, LayoutTemplate, TreePine, FileUp, UserPlus, Send,
  Lock, ScrollText, Scale, CheckCircle2, Leaf, ArrowRight,
  Menu, X, Quote
} from "lucide-react";
import { Helmet } from "react-helmet-async";

/* ── Animated counter hook ── */
function useCounter(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration, startOnView]);

  return { count, ref };
}

/* ── Data ── */
const features = [
  { icon: Shield, title: "Secure Digital Signatures", desc: "Bank-grade encryption protects every document and signature.", bg: "bg-blue-50 dark:bg-blue-950/40", iconBg: "bg-blue-100 dark:bg-blue-900/60", iconColor: "text-blue-600 dark:text-blue-400", ring: "ring-blue-200/50 dark:ring-blue-800/30", image: featureSecureSignatures },
  { icon: Users, title: "Multi-Organization Support", desc: "Manage multiple organizations and teams from one account.", bg: "bg-purple-50 dark:bg-purple-950/40", iconBg: "bg-purple-100 dark:bg-purple-900/60", iconColor: "text-purple-600 dark:text-purple-400", ring: "ring-purple-200/50 dark:ring-purple-800/30", image: featureMultiOrg },
  { icon: LayoutTemplate, title: "Document Templates", desc: "Create reusable templates to speed up your workflow.", bg: "bg-amber-50 dark:bg-amber-950/40", iconBg: "bg-amber-100 dark:bg-amber-900/60", iconColor: "text-amber-600 dark:text-amber-400", ring: "ring-amber-200/50 dark:ring-amber-800/30", image: featureTemplates },
  { icon: ClipboardCheck, title: "Audit Trail Compliance", desc: "Full audit logs for every document action, legally defensible.", bg: "bg-teal-50 dark:bg-teal-950/40", iconBg: "bg-teal-100 dark:bg-teal-900/60", iconColor: "text-teal-600 dark:text-teal-400", ring: "ring-teal-200/50 dark:ring-teal-800/30", image: featureAuditTrail },
  { icon: UserPlus, title: "Multi-User Collaboration", desc: "Invite signers, set signing order, and collaborate in real time.", bg: "bg-rose-50 dark:bg-rose-950/40", iconBg: "bg-rose-100 dark:bg-rose-900/60", iconColor: "text-rose-600 dark:text-rose-400", ring: "ring-rose-200/50 dark:ring-rose-800/30", image: featureCollaboration },
  { icon: Cloud, title: "Cloud Document Storage", desc: "Access your documents securely from anywhere, anytime.", bg: "bg-sky-50 dark:bg-sky-950/40", iconBg: "bg-sky-100 dark:bg-sky-900/60", iconColor: "text-sky-600 dark:text-sky-400", ring: "ring-sky-200/50 dark:ring-sky-800/30", image: featureCloudStorage },
  { icon: CreditCard, title: "Subscription Billing", desc: "Flexible plans with Stripe-powered billing and invoicing.", bg: "bg-emerald-50 dark:bg-emerald-950/40", iconBg: "bg-emerald-100 dark:bg-emerald-900/60", iconColor: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-200/50 dark:ring-emerald-800/30", image: featureBilling },
  { icon: Bot, title: "AI Business Assistant", desc: "Leverage AI to draft, summarize, and manage documents faster.", bg: "bg-violet-50 dark:bg-violet-950/40", iconBg: "bg-violet-100 dark:bg-violet-900/60", iconColor: "text-violet-600 dark:text-violet-400", ring: "ring-violet-200/50 dark:ring-violet-800/30", image: featureAiAssistant },
];

/* plans are now fetched from the database */

const testimonials = [
  {
    quote: "eFinSign reduced our document processing time by 80%. We've completely eliminated paper from our workflow.",
    name: "Sarah Mitchell",
    role: "Finance Manager, Greenfield Capital",
  },
  {
    quote: "The environmental impact dashboard really resonated with our team. We're proud to show clients how many trees we've saved.",
    name: "David Chen",
    role: "Partner, Chen & Associates Law",
  },
  {
    quote: "Setup took 5 minutes. Our entire team was signing documents the same day. Incredible onboarding experience.",
    name: "Amara Osei",
    role: "HR Director, NovaTech Solutions",
  },
];

/* ── Component ── */
interface PlanDisplay {
  name: string;
  price: string;
  period: string;
  docs: string;
  users: string;
  features: string[];
  highlighted: boolean;
  stripe_price_id: string | null;
}

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<PlanDisplay[]>([]);

  const pages = useCounter(2540000);
  const trees = useCounter(7800);
  const co2 = useCounter(120);

  useEffect(() => {
    supabase.from("pricing_plans").select("*").order("sort_order").then(({ data }) => {
      if (!data) return;
      setPlans(data.map((p: any) => ({
        name: p.name,
        price: p.price_cents === 0 ? "Custom" : `$${p.price_cents / 100}`,
        period: p.price_cents === 0 ? "" : `/${p.period === "month" ? "mo" : p.period}`,
        docs: p.max_documents ? `${p.max_documents} documents` : "Unlimited documents",
        users: p.max_users ? `${p.max_users} users` : "Unlimited users",
        features: Array.isArray(p.features) ? p.features : [],
        highlighted: p.highlighted,
        stripe_price_id: p.stripe_price_id,
      })));
    });
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navLinks = [
    { label: "Features", id: "features" },
    { label: "Pricing", id: "pricing" },
    { label: "How It Works", id: "how-it-works" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>eFinSign — Eco-Friendly Electronic Signature Platform</title>
        <meta name="description" content="Sign documents digitally and save trees. eFinSign offers secure e-signatures, templates, multi-org support, and audit trails for modern businesses." />
        <meta property="og:title" content="eFinSign — Eco-Friendly Electronic Signature Platform" />
        <meta property="og:description" content="Sign documents digitally and save trees. Secure e-signatures, templates, and audit trails for modern businesses." />
        <link rel="canonical" href="https://efinsign.ca/landing" />
      </Helmet>
      {/* ── Sticky Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <img src={efinsignLogo} alt="eFinSign Logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display text-xl font-bold tracking-tight">eFinSign</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background px-4 pb-4 pt-2 md:hidden">
            {navLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="block w-full py-2 text-left text-sm font-medium text-muted-foreground"
              >
                {l.label}
              </button>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" asChild className="w-full">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild className="w-full">
                <Link to="/auth">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50/60 via-background to-primary/5 dark:from-emerald-950/20 dark:via-background dark:to-primary/10" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Leaf className="h-4 w-4" />
                Go paperless today
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Sign Documents Digitally.{" "}
                <span className="text-emerald-600 dark:text-emerald-400">Save Time. Save Trees.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                eFinSign enables businesses to sign documents securely online while eliminating paper waste
                and reducing operational costs.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start sm:justify-center">
                <Button size="lg" className="gap-2 px-8 text-base" asChild>
                  <Link to="/auth">
                    Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 px-8 text-base" asChild>
                  <a href="mailto:demo@efinsign.com">Book a Demo</a>
                </Button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 opacity-30 blur-lg group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-emerald-200/40 dark:shadow-emerald-900/30 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30">
                  <img
                    src={heroPaperless}
                    alt="Professional saving trees by going paperless — reducing carbon footprint and protecting the ozone layer"
                    className="w-full max-w-xl object-cover lg:max-w-2xl"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-900/80 via-emerald-900/40 to-transparent px-5 pb-4 pt-12">
                    <div className="flex items-center gap-2">
                      <TreePine className="h-5 w-5 text-emerald-300" />
                      <span className="text-sm font-semibold text-white drop-shadow">Saving Trees, One Signature at a Time</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-200/80">Reduce carbon footprint · Protect the ozone layer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Environmental Impact ── */}
      <section className="border-y border-emerald-200/50 bg-emerald-50/50 py-16 dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <TreePine className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Environmental Impact</h2>
          </div>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
            Every digital signature saves paper, ink, and transportation costs. Together we're building a greener future.
          </p>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div ref={pages.ref}>
              <p className="font-display text-4xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-5xl">
                {pages.count.toLocaleString()}
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">Pages Saved</p>
            </div>
            <div ref={trees.ref}>
              <p className="font-display text-4xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-5xl">
                {trees.count.toLocaleString()}
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">Trees Protected</p>
            </div>
            <div ref={co2.ref}>
              <p className="font-display text-4xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-5xl">
                {co2.count} <span className="text-2xl sm:text-3xl">tons</span>
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">CO₂ Reduced</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything You Need to Go Paperless</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              A complete digital signing platform built for modern businesses.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className={`group relative border-border/50 transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 overflow-hidden`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${f.iconBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="p-0">
                  {/* Feature illustration */}
                  <div className={`flex items-center justify-center ${f.bg} p-4`}>
                    <img
                      src={f.image}
                      alt={f.title}
                      className="h-28 w-28 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 pt-4">
                    <div className="relative mb-4">
                      <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${f.iconBg} ${f.iconColor} ring-1 ${f.ring} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                        <f.icon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                    </div>
                    <h3 className="font-display text-base font-semibold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      Learn more <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl mb-4">How It Works</h2>
          <p className="text-muted-foreground mb-14 max-w-xl mx-auto">
            Get documents signed in three simple steps.
          </p>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {[
              { icon: FileUp, step: "1", title: "Upload Document", desc: "Drag & drop your PDF or create from a template." },
              { icon: UserPlus, step: "2", title: "Add Signers", desc: "Set signing fields, order, and assign recipients." },
              { icon: Send, step: "3", title: "Send & Sign", desc: "Signers receive a secure link and sign instantly." },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="relative mb-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                    <s.icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-muted-foreground">All prices in CAD. Start free, upgrade anytime.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <Card
                key={p.name}
                className={`relative flex flex-col transition hover:shadow-lg ${
                  p.highlighted
                    ? "border-primary shadow-md ring-2 ring-primary/20"
                    : "border-border/50"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-6 pt-8">
                  <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                  <div className="mt-3 mb-1">
                    <span className="font-display text-4xl font-bold">{p.price}</span>
                    <span className="text-muted-foreground text-sm">{p.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.docs} · {p.users}</p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={p.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/auth">
                      {p.name === "Enterprise" ? "Contact Sales" : "Start Free Trial"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Billing powered by Stripe · Cancel anytime · No credit card required for trial
          </p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Trusted by Modern Businesses</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/50">
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-primary/20 mb-3" />
                  <p className="text-sm leading-relaxed italic text-foreground/90">"{t.quote}"</p>
                  <div className="mt-5 border-t border-border/50 pt-4">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security & Compliance ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl mb-4">Security & Compliance</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-12">
            eFinSign meets global electronic signature standards and keeps your documents safe.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Lock, title: "Bank-Grade Encryption", desc: "256-bit AES encryption at rest and TLS 1.3 in transit." },
              { icon: ScrollText, title: "Full Audit Logs", desc: "Every action is timestamped and recorded for compliance." },
              { icon: Scale, title: "Legally Binding", desc: "Compliant with eIDAS, ESIGN Act, and UETA regulations." },
            ].map((s) => (
              <div key={s.title} className="flex flex-col items-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-base font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/90 to-emerald-700/90 dark:from-primary/80 dark:to-emerald-800/80" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
            Start Signing Documents in Minutes
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Join thousands of businesses that have gone paperless with eFinSign.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="gap-2 bg-white text-primary hover:bg-white/90 px-8 text-base"
              asChild
            >
              <Link to="/auth">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/40 text-white hover:bg-white/10 px-8 text-base"
              asChild
            >
              <a href="mailto:demo@efinsign.com">Schedule Demo</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={efinsignLogo} alt="eFinSign Logo" className="h-7 w-7 rounded object-contain" />
                <span className="font-display text-lg font-bold">eFinSign</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Secure, eco-friendly digital document signing for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => scrollTo("features")} className="hover:text-foreground transition">Features</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition">Pricing</button></li>
                <li><button onClick={() => scrollTo("how-it-works")} className="hover:text-foreground transition">How It Works</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="cursor-default">Privacy Policy</span></li>
                <li><span className="cursor-default">Terms of Service</span></li>
                <li><span className="cursor-default">Cookie Policy</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:support@efinsign.com" className="hover:text-foreground transition">support@efinsign.com</a></li>
                <li><a href="mailto:demo@efinsign.com" className="hover:text-foreground transition">Book a Demo</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} eFinSign. All rights reserved. 🌱 Going paperless, one signature at a time.
          </div>
        </div>
      </footer>
    </div>
  );
}
