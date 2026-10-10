import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const navigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/contexts/AuthContext", () => {
  const user = { id: "user-1" };
  return { useAuth: () => ({ user }) };
});

vi.mock("@/contexts/OrganizationContext", () => {
  const currentOrg = { id: "org-1", name: "EFintax Advisors Ltd" };
  return { useOrganization: () => ({ currentOrg }) };
});

const docs = [
  { id: "1", title: "eFintax Advisors Ltd_FS_2025.v1", status: "completed", created_at: "2026-10-04T12:00:00.000Z", file_path: null, signed_file_path: null },
  { id: "2", title: "eFintax Advisors Ltd_FS_2025", status: "pending", created_at: "2026-10-04T12:00:00.000Z", file_path: null, signed_file_path: null },
  { id: "3", title: "Lead Verification Form 2026", status: "draft", created_at: "2026-08-21T12:00:00.000Z", file_path: null, signed_file_path: null },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: docs }),
        }),
      }),
    }),
  },
}));

function renderDashboard() {
  return render(
    <HelmetProvider>
      <Dashboard />
    </HelmetProvider>
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it("shows the workspace, counts, and documents", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText(/Documents, signatures, and what still needs a hand/)).toBeInTheDocument();
    expect(screen.getByText("Total documents")).toBeInTheDocument();
    expect(screen.getByText("Awaiting signature")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /eFintax Advisors Ltd_FS_2025\.v1/ })).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getByText("33% signed")).toBeInTheDocument();
  });

  it("filters by status and search without dropping the new-document action", async () => {
    renderDashboard();
    await screen.findByRole("link", { name: /Lead Verification Form 2026/ });

    fireEvent.click(screen.getByRole("button", { name: /Awaiting/ }));
    expect(screen.getByRole("link", { name: /FS_2025 Oct/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Lead Verification Form 2026/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    fireEvent.change(screen.getByPlaceholderText("Search documents..."), { target: { value: "Lead" } });
    expect(screen.getByRole("link", { name: /Lead Verification Form 2026/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /eFintax Advisors Ltd_FS_2025\.v1/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "New Document" })[0]);
    expect(navigate).toHaveBeenCalledWith("/documents/new");
  });

  it("opens a document from the register", async () => {
    renderDashboard();
    const row = await screen.findByRole("link", { name: /eFintax Advisors Ltd_FS_2025\.v1/ });
    fireEvent.click(row);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/documents/1"));
  });
});
