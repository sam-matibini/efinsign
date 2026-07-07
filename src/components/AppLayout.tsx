import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { ProfileCompletionGate } from "@/components/ProfileCompletionGate";

export function AppLayout() {
  return (
    <OrganizationProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b border-border/50 px-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <SubscriptionBadge />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
            <ProfileCompletionGate />
          </div>
        </div>
      </SidebarProvider>
    </OrganizationProvider>
  );
}
