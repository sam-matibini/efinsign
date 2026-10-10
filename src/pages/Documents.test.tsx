import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Documents from "./Documents";

const navigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/contexts/AuthContext", () => {
  const user = { id: "user-1" };
  return { useAuth: () => ({ user }) };
});

vi.mock("@/contexts/OrganizationContext", () => {
  const currentOrg = { id: "org-1", name: "eFinMoney" };
  return { useOrganization: () => ({ currentOrg }) };
});

const docs = [
  { id: "doc-1", title: "ADI_NDA Mutual Disclosure", status: "completed", created_at: "2026-09-29T12:00:00.000Z", file_path: null, signed_file_path: null },
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
    storage: { from: () => ({ remove: vi.fn() }) },
  },
}));

describe("Documents", () => {
  it("lists organization documents and opens one", async () => {
    render(<Documents />);
    expect(await screen.findByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByText("eFinMoney · 1 document")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /ADI_NDA Mutual Disclosure/ }));
    expect(navigate).toHaveBeenCalledWith("/documents/doc-1");
  });
});
