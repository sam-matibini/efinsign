import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PdfEditorToolbar from "./PdfEditorToolbar";
import FillSignSidebar from "@/components/FillSignSidebar";

const toolbarProps = {
  docTitle: "Agreement",
  tool: "text" as const,
  setTool: vi.fn(),
  fontSize: 14,
  setFontSize: vi.fn(),
  textColor: "#111827",
  setTextColor: vi.fn(),
  textBackground: "none",
  setTextBackground: vi.fn(),
  textFont: "helvetica" as const,
  setTextFont: vi.fn(),
  textBold: false,
  setTextBold: vi.fn(),
  textItalic: false,
  setTextItalic: vi.fn(),
  textUnderline: false,
  setTextUnderline: vi.fn(),
  textStrike: false,
  setTextStrike: vi.fn(),
  textAlign: "left" as const,
  setTextAlign: vi.fn(),
  lineHeight: 1.15,
  setLineHeight: vi.fn(),
  listStyle: "none" as const,
  setListStyle: vi.fn(),
  drawColor: "#000",
  setDrawColor: vi.fn(),
  strokeWidth: 2,
  setStrokeWidth: vi.fn(),
  selectedStamp: null,
  setSelectedStamp: vi.fn(),
  checkmarkSize: 28,
  setCheckmarkSize: vi.fn(),
  checkStyle: "check" as const,
  setCheckStyle: vi.fn(),
  onBumpFont: vi.fn(),
  highlightColor: "#fde047",
  setHighlightColor: vi.fn(),
  highlightOpacity: 0.3,
  setHighlightOpacity: vi.fn(),
  shapeType: "rect" as const,
  setShapeType: vi.fn(),
  shapeStrokeColor: "#000",
  setShapeStrokeColor: vi.fn(),
  shapeFillColor: "none",
  setShapeFillColor: vi.fn(),
  shapeStrokeWidth: 2,
  setShapeStrokeWidth: vi.fn(),
  onImageUpload: vi.fn(),
  saving: false,
  onSave: vi.fn(),
  onBack: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  canUndo: false,
  canRedo: false,
  onOpenWatermark: vi.fn(),
  onOpenHeaderFooter: vi.fn(),
};

describe("PDF editor enhancements", () => {
  it("keeps the existing tools and adds cover, watermark, and wrapped text", () => {
    render(<PdfEditorToolbar {...toolbarProps} />);
    expect(screen.getByRole("button", { name: "Text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draw" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cover" })).toBeInTheDocument();
    expect(screen.getByText(/Wraps inside the box/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Watermark" }));
    expect(toolbarProps.onOpenWatermark).toHaveBeenCalled();
  });

  it("adds Word-like text controls, extra shapes, signature, and Next sticky", () => {
    const { rerender } = render(<PdfEditorToolbar {...toolbarProps} />);
    expect(screen.getByTitle("Italic")).toBeInTheDocument();
    expect(screen.getByTitle("Underline")).toBeInTheDocument();
    expect(screen.getByTitle("Text background")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Signature" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(toolbarProps.setTool).toHaveBeenCalledWith("sticky");
    rerender(<PdfEditorToolbar {...toolbarProps} tool="shape" />);
    expect(screen.getByTitle("Triangle")).toBeInTheDocument();
    expect(screen.getByTitle("Diamond")).toBeInTheDocument();
    expect(screen.getByTitle("Arrow")).toBeInTheDocument();
    expect(screen.getByTitle("Rounded")).toBeInTheDocument();
  });
});

describe("Fill & Sign account details", () => {
  it("shows the account holder details and places full name from the profile", () => {
    const onIdentityField = vi.fn();
    render(
      <FillSignSidebar
        pendingFieldType={null}
        onFieldTypeClick={vi.fn()}
        savedSignature={null}
        savedInitials={null}
        onSaveSignature={vi.fn()}
        onSaveInitials={vi.fn()}
        onDeleteSignature={vi.fn()}
        onDeleteInitials={vi.fn()}
        onSignAndSave={vi.fn()}
        onCancel={vi.fn()}
        signing={false}
        allSavedSignatures={[]}
        allSavedInitials={[]}
        onPersistSignature={vi.fn()}
        onPersistInitials={vi.fn()}
        onDeleteSavedSig={vi.fn()}
        onTextFieldRequest={vi.fn()}
        onIdentityField={onIdentityField}
        accountFullName="Sam Matibini"
        accountTitle="Partner"
        accountDate="May 12, 2026"
      />
    );
    expect(screen.getByText("Sam Matibini")).toBeInTheDocument();
    expect(screen.getByText("Partner")).toBeInTheDocument();
    expect(screen.getByText("May 12, 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Full Name" }));
    expect(onIdentityField).toHaveBeenCalledWith("full_name");
  });
});
