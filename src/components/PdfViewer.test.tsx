import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("pdfjs-dist", () => ({
  getDocument: () => ({ promise: new Promise(() => {}) }),
  GlobalWorkerOptions: { workerSrc: "" },
  version: "4.0.0",
}));

import PdfViewer from "./PdfViewer";

describe("document preview chrome", () => {
  it("shows Adobe-style review tools", () => {
    render(<PdfViewer url="/preview.pdf" className="h-[400px]" />);
    expect(screen.getByRole("button", { name: "Fit width" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit page" })).toBeInTheDocument();
    expect(screen.getByLabelText("Find in document")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print/ })).toBeInTheDocument();
  });
});
