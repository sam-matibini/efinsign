import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import efinsignLogo from "@/assets/efinsign-logo.png";

const ORG_STORAGE_KEY = "efinsign_current_org";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();


  const [status, setStatus] = useState<"loading" | "accepting" | "success" | "error" | "login_required" | "verify_email">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Inline auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus("error");
      setErrorMsg("No invitation token provided.");
      return;
    }

    if (!user) {
      setStatus("login_required");
      return;
    }

    acceptInvitation();
  }, [user, authLoading, token]);

  const acceptInvitation = async () => {
    setStatus("accepting");
    try {
      const { data, error } = await supabase.functions.invoke("accept-org-invitation", {
        body: { token },
      });

      if (error) {
        setStatus("error");
        setErrorMsg(error.message || "Failed to accept invitation.");
        return;
      }

      if (data?.error) {
        setStatus("error");
        setErrorMsg(data.error);
        return;
      }

      setStatus("success");
      if (data?.organization_id) {
        try { localStorage.setItem(ORG_STORAGE_KEY, data.organization_id); } catch {}
      }
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (err: any) {

      setStatus("error");
      setErrorMsg(err.message || "An unexpected error occurred.");
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        // useEffect will auto-trigger acceptInvitation
      } else {
        await signUp(email, password, fullName);
        setStatus("verify_email");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={efinsignLogo} alt="eFinSign" className="h-10 w-10 rounded-lg object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground">eFinSign</h1>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Organization Invitation</CardTitle>
            {status === "login_required" && (
              <CardDescription>
                {isLogin ? "Sign in to accept this invitation" : "Create an account to join the organization"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            {(status === "loading" || status === "accepting") && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  {status === "loading" ? "Loading..." : "Accepting invitation..."}
                </p>
              </>
            )}

            {status === "login_required" && (
              <form onSubmit={handleAuthSubmit} className="w-full space-y-4 text-left">
                {!isLogin && (
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
                <Button type="submit" className="w-full" disabled={authSubmitting}>
                  {authSubmitting ? "Please wait..." : isLogin ? "Sign In & Accept" : "Create Account"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary hover:underline"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </p>
              </form>
            )}

            {status === "verify_email" && (
              <>
                <Mail className="h-10 w-10 text-primary" />
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  We've sent a verification link to <strong>{email}</strong>. Verify your email, then come back to this page to accept the invitation.
                </p>
                <Button variant="outline" onClick={() => { setStatus("login_required"); setIsLogin(true); }}>
                  I've verified — Sign in
                </Button>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-10 w-10 text-primary" />
                <p className="font-medium">Invitation accepted!</p>
                <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-10 w-10 text-destructive" />
                <p className="font-medium">Unable to accept invitation</p>
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
                <Button variant="outline" asChild>
                  <Link to="/">Go to Dashboard</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
