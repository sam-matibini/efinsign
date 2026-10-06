import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, activeSidebarItem } from "./AppSidebar";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn(), isPlatformAdmin: false }),
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    currentOrg: { id: "org-1", name: "EFintax Advisors Ltd" },
    orgs: [{ id: "org-1", name: "EFintax Advisors Ltd" }],
    switchOrg: vi.fn(),
    createOrg: vi.fn(),
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>
  );
}

function highlighted() {
  return screen.getAllByRole("link").filter((link) => link.getAttribute("data-active") === "true").map((link) => link.textContent);
}

describe("activeSidebarItem", () => {
  it("selects one tab when several items share the new-document route", () => {
    expect(activeSidebarItem("/documents/new", "")).toBe("new");
    expect(activeSidebarItem("/documents/new", "?flow=fill")).toBe("fill");
    expect(activeSidebarItem("/documents/new", "?flow=request")).toBe("request");
    expect(activeSidebarItem("/documents/new", "?template=abc")).toBe("new");
    expect(activeSidebarItem("/", "")).toBe("dashboard");
    expect(activeSidebarItem("/documents/abc", "")).toBe("documents");
  });
});

describe("AppSidebar", () => {
  it("highlights only New Document on the plain new-document page", () => {
    renderAt("/documents/new");
    expect(highlighted()).toEqual(["New Document"]);
  });

  it("highlights only the clicked shared action", () => {
    renderAt("/documents/new?flow=fill");
    expect(highlighted()).toEqual(["Fill & Sign"]);
    expect(screen.getByRole("link", { name: "Fill & Sign" })).toHaveAttribute("href", "/documents/new?flow=fill");
  });

  it("highlights only Request e-Signatures for that flow", () => {
    renderAt("/documents/new?flow=request");
    expect(highlighted()).toEqual(["Request e-Signatures"]);
  });
});
