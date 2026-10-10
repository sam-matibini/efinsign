import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PdfEditorLanding from "./PdfEditorLanding";

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
  { id: "1", title: "Board Resolution", status: "completed", updated_at: "2026-09-07T12:00:00.000Z", file_path: "a.pdf", signed_file_path: null },
  { id: "2", title: "Payment Services Agreement", status: "completed", updated_at: "2026-09-18T12:00:00.000Z", file_path: "b.pdf", signed_file_path: null },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            order: () => Promise.resolve({ data: docs }),
          }),
        }),
      }),
    }),
  },
}));

describe("PdfEditorLanding", () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockClear();
  });

  it("switches the library between tiles and rows", async () => {
    render(<PdfEditorLanding />);
    expect(await screen.findByText("Board Resolution")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiles" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Rows" }));

    expect(screen.getByRole("button", { name: "Rows" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit PDF" })).toHaveLength(2);
    await waitFor(() => expect(localStorage.getItem("efinsign-pdf-editor-view")).toBe("rows"));
  });
});
