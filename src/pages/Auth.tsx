import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowLeft, AlertCircle } from "lucide-react";
import efinsignLogo from "@/assets/efinsign-logo.png";
import { Helmet } from "react-helmet-async";

type SignInError = {
  message: string;
  kind: "invalid" | "unconfirmed" | "rate" | "other";
} | null;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signInError, setSignInError] = useState<SignInError>(null);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const interpretSignInError = (raw: string): SignInError => {
    const msg = (raw || "").toLowerCase();
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      return {
        kind: "invalid",
        message:
          "We couldn't find an account with that email, or the password is incorrect. Double-check the spelling of your email.",
      };
    }
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return {
        kind: "unconfirmed",
        message:
          "Please confirm your email first. Check your inbox for the verification link.",
      };
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return {
        kind: "rate",
        message: "Too many attempts. Please wait a minute and try again.",
      };
    }
    return { kind: "other", message: raw || "Sign-in failed. Please try again." };
  };

  const handleResendConfirmation = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Confirmation email resent. Check your inbox.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not resend confirmation email");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setLoading(true);
    try {
      if (isForgot) {
        await resetPassword(email);
        toast.success("Password reset email sent. Check your inbox.");
        setIsForgot(false);
      } else if (isLogin) {
        const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
        if (!looksLikeEmail) {
          setSignInError({
            kind: "other",
            message: "That email address doesn't look right. Please check for typos.",
          });
          setLoading(false);
          return;
        }
        await signIn(email, password);
        navigate(redirectTo);
      } else {
        await signUp(email, password, fullName);
        toast.success("Account created! Check your email to verify. You'll get a 7-day free trial of our Starter plan.", {
          duration: 8000,
        });
      }
    } catch (err: any) {
      if (isLogin && !isForgot) {
        setSignInError(interpretSignInError(err?.message ?? ""));
      } else {
        toast.error(err?.message ?? "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Helmet>
        <title>{isForgot ? "Reset Password" : isLogin ? "Sign In" : "Start Free Trial"} - eFinSign</title>
        <meta name="description" content={isForgot ? "Reset your eFinSign account password." : isLogin ? "Sign in to your eFinSign account to manage and sign documents." : "Create your eFinSign account and start a 7-day free trial of eco-friendly document signing."} />
        <meta property="og:title" content={`${isForgot ? "Reset Password" : isLogin ? "Sign In" : "Start Free Trial"} - eFinSign`} />
        <meta property="og:description" content={isForgot ? "Reset your eFinSign account password." : isLogin ? "Sign in to your eFinSign account." : "Start a 7-day free trial of eFinSign."} />
        <link rel="canonical" href="https://efinsign.ca/auth" />
      </Helmet>
      <div className="w-full max-w-md animate-fade-in">
        <Link to="/landing" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={efinsignLogo} alt="eFinSign Logo" className="h-10 w-10 rounded-lg object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isForgot ? "Reset Your eFinSign Password" : isLogin ? "Sign In to eFinSign" : "Create Your eFinSign Account"}
          </h1>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="font-display">
              {isForgot ? "Reset Password" : isLogin ? "Welcome back" : "Create account"}
            </CardTitle>
            <CardDescription>
              {isForgot
                ? "Enter your email to receive a reset link"
                : isLogin
                 ? "Sign in to your eFinSign account"
                 : "Start your 7-day free trial — no credit card required"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              {!isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}
              {signInError && isLogin && !isForgot && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{signInError.message}</span>
                  </div>
                  {signInError.kind === "invalid" && (
                    <div className="mt-2 flex flex-wrap gap-3 pl-6">
                      <button
                        type="button"
                        onClick={() => { setIsForgot(true); setSignInError(null); }}
                        className="text-primary hover:underline"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsLogin(false); setSignInError(null); }}
                        className="text-primary hover:underline"
                      >
                        Create account instead
                      </button>
                    </div>
                  )}
                  {signInError.kind === "unconfirmed" && (
                    <div className="mt-2 pl-6">
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        className="text-primary hover:underline"
                      >
                        Resend confirmation email
                      </button>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : isForgot
                  ? "Send Reset Link"
                  : isLogin
                  ? "Sign In"
                  : "Start Free Trial"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm space-y-2">
              {!isForgot && (
                <button
                  type="button"
                  onClick={() => setIsForgot(true)}
                  className="text-primary hover:underline block mx-auto"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsForgot(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                {isLogin ? "Don't have an account? Start free trial" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
