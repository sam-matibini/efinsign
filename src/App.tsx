import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import DocumentNew from "./pages/DocumentNew";
import DocumentPrepare from "./pages/DocumentPrepare";
import PdfEdit from "./pages/PdfEdit";
import PdfEditorLanding from "./pages/PdfEditorLanding";
import DocumentDetail from "./pages/DocumentDetail";
import Templates from "./pages/Templates";
import SettingsPage from "./pages/SettingsPage";
import ClientsPage from "./pages/ClientsPage";
import OrgSettings from "./pages/OrgSettings";
import AdminDashboard from "./pages/AdminDashboard";
import Sign from "./pages/Sign";
import AcceptInvite from "./pages/AcceptInvite";
import SubscriptionGate from "./components/SubscriptionGate";
import React, { Suspense } from "react";
const Landing = React.lazy(() => import("./pages/Landing"));
import Trust from "./pages/Trust";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to={`/landing`} replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  if (loading) return null;
  if (user) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/landing" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>}><Landing /></Suspense>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/sign" element={<Sign />} />
              <Route path="/invite" element={<AcceptInvite />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route element={<ProtectedRoute><SubscriptionGate><OrganizationProvider><AppLayout /></OrganizationProvider></SubscriptionGate></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/documents" element={<Navigate to="/" replace />} />
                <Route path="/documents/new" element={<DocumentNew />} />
                <Route path="/documents/:id" element={<DocumentDetail />} />
                <Route path="/documents/:id/prepare" element={<DocumentPrepare />} />
                <Route path="/documents/:id/edit" element={<PdfEdit />} />
                <Route path="/pdf-editor" element={<PdfEditorLanding />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/settings" element={<Navigate to="/settings/organization" replace />} />
                <Route path="/settings/organization" element={<OrgSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
