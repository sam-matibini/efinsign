import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, Check, Zap, Shield, FileCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "EfinSign — Coming Soon" },
      { name: "description", content: "The future of digital signatures. Be the first to know when EfinSign launches." },
      { property: "og:title", content: "EfinSign — Coming Soon" },
      { property: "og:description", content: "The future of digital signatures. Be the first to know when EfinSign launches." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.72 0.14 195 / 0.12) 0%, transparent 70%)",
            animation: "pulse-glow 4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.6 0.1 250 / 0.08) 0%, transparent 70%)",
            animation: "pulse-glow 5s ease-in-out infinite 1s",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        {/* Logo / Brand */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">EfinSign</span>
        </div>

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Coming Soon
        </div>

        {/* Headline */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Sign Documents
          <br />
          <span className="text-primary">Without the Friction</span>
        </h1>

        <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-muted-foreground">
          EfinSign is reimagining how businesses handle digital signatures.
          Secure, fast, and beautifully simple.
        </p>

        {/* Features */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Bank-Grade Security</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
            <FileCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Legally Binding</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Sign in Seconds</span>
          </div>
        </div>

        {/* Email signup */}
        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-border/60 bg-card/80 pl-10 text-base placeholder:text-muted-foreground/60 focus-visible:ring-primary/50"
              />
            </div>
            <Button
              type="submit"
              className="h-12 gap-2 bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Notify Me
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/10 py-4 text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Check className="h-4 w-4" />
            </div>
            <span className="font-medium">You're on the list. We'll be in touch!</span>
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground/60">
          No spam. Unsubscribe anytime.
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-sm text-muted-foreground/40">
        &copy; {new Date().getFullYear()} EfinSign. All rights reserved.
      </footer>
    </main>
  );
}
