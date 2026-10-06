import { LayoutDashboard, FileText, FilePlus, PenTool, FilePenLine, Send, FolderOpen, Settings, LogOut, X, Users, Building2, ChevronsUpDown, Check, Search, Plus, ShieldCheck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import efinsignLogo from "@/assets/efinsign-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "text-blue-500" },
  { title: "Documents", url: "/documents", icon: FileText, color: "text-emerald-500" },
  { title: "New Document", url: "/documents/new", icon: FilePlus, color: "text-orange-500" },
  { title: "Fill & Sign", url: "/documents/new", icon: PenTool, color: "text-violet-500" },
  { title: "PDF Editor", url: "/pdf-editor", icon: FilePenLine, color: "text-cyan-500" },
  { title: "Request e-Signatures", url: "/documents/new", icon: Send, color: "text-rose-500" },
  { title: "Clients", url: "/clients", icon: Users, color: "text-amber-500" },
  { title: "Templates", url: "/templates", icon: FolderOpen, color: "text-teal-500" },
  { title: "Admin", url: "/admin", icon: ShieldCheck, color: "text-red-500" },
  { title: "Settings", url: "/settings/organization", icon: Settings, color: "text-slate-500" },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, isPlatformAdmin } = useAuth();
  const { currentOrg, orgs, switchOrg, createOrg } = useOrganization();
  const [orgSearch, setOrgSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreating(true);
    const id = await createOrg(newOrgName.trim());
    if (id) {
      toast.success("Organization created");
      setCreateOpen(false);
      setNewOrgName("");
    } else {
      toast.error("Failed to create organization");
    }
    setCreating(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const filteredOrgs = orgs.filter((org) =>
    org.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={efinsignLogo} alt="eFinSign" className="h-8 w-8 rounded-lg shrink-0 object-contain" />
            {!collapsed && <span className="font-display font-bold text-lg text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] hover:drop-shadow-[0_0_16px_rgba(59,130,246,0.8)] hover:scale-105 transition-all duration-300 cursor-default">eFinSign</span>}
          </div>
          {!collapsed && (
            <button onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Organization Switcher */}
        {!collapsed && currentOrg && (
          <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (!open) setOrgSearch(""); }}>
            <PopoverTrigger asChild>
              <button className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate flex-1">{currentOrg.name}</span>
                {orgs.length > 1 && <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </button>
            </PopoverTrigger>
            {orgs.length > 1 && (
              <PopoverContent className="w-56 p-0" align="start">
                <div className="flex items-center border-b border-border px-3">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                    placeholder="Search organizations..."
                    className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                  />
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="p-1">
                    {filteredOrgs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No organizations found</p>
                    ) : (
                      filteredOrgs.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => { switchOrg(org.id); setPopoverOpen(false); setOrgSearch(""); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{org.name}</span>
                          {org.id === currentOrg.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t border-border p-1">
                  <button
                    onClick={() => { setPopoverOpen(false); setCreateOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left text-muted-foreground"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>Create Organization</span>
                  </button>
                </div>
              </PopoverContent>
            )}
          </Popover>
        )}

        {/* Single org — still show create button */}
        {!collapsed && currentOrg && orgs.length <= 1 && (
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors text-left"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Create Organization</span>
          </button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems
                .filter((item) => item.title !== "Admin" || isPlatformAdmin)
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50 py-3 border-l-2 border-transparent" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium border-[#d6f34a]">
                      <item.icon className={`mr-3 h-5 w-5 ${item.color}`} />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-3 h-5 w-5" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Create Organization Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Add a new organization to manage documents and team members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={!newOrgName.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
