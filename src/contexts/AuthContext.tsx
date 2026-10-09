import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  subscribed: boolean;
  trialing: boolean;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  trialEnd: string | null;
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPlatformAdmin: boolean;
  subscription: SubscriptionState;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  createCheckout: (priceId?: string) => Promise<string | null>;
  openCustomerPortal: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    trialing: false,
    productId: null,
    priceId: null,
    subscriptionEnd: null,
    trialEnd: null,
    loading: true,
  });

  const checkPlatformAdmin = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId)
        .eq("role", "platform_admin")
        .maybeSingle();
      setIsPlatformAdmin(!!data);
    } catch {
      setIsPlatformAdmin(false);
    }
  };

  const refreshSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription({
        subscribed: data.subscribed ?? false,
        trialing: data.trialing ?? false,
        productId: data.product_id ?? null,
        priceId: data.price_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        trialEnd: data.trial_end ?? null,
        loading: false,
      });
    } catch {
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const createCheckout = useCallback(async (priceId?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data.already_subscribed) {
        await refreshSubscription();
        return null;
      }
      return data.url;
    } catch {
      return null;
    }
  }, [refreshSubscription]);

  const openCustomerPortal = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      return data.url;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => checkPlatformAdmin(session.user.id), 0);
        setTimeout(() => refreshSubscription(), 0);
      } else {
        setIsPlatformAdmin(false);
        setSubscription({ subscribed: false, trialing: false, productId: null, priceId: null, subscriptionEnd: null, trialEnd: null, loading: false });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkPlatformAdmin(session.user.id);
        refreshSubscription();
      } else {
        setSubscription(prev => ({ ...prev, loading: false }));
      }
    });

    return () => authSub.unsubscribe();
  }, [refreshSubscription]);

  // Auto-refresh subscription every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, refreshSubscription]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, isPlatformAdmin, subscription,
      signUp, signIn, signOut, resetPassword,
      refreshSubscription, createCheckout, openCustomerPortal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
