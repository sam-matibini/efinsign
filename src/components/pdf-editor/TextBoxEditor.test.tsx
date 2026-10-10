import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TextBoxEditor from "./TextBoxEditor";

const props = {
  x: 20,
  y: 40,
  width: 220,
  height: 56,
  text: "Board resolution",
  fontSize: 14,
  align: "left" as const,
  pageWidth: 800,
  pageHeight: 1100,
  otherRects: [],
  onChange: vi.fn(),
  onCommit: vi.fn(),
  onCancel: vi.fn(),
};

describe("TextBoxEditor save", () => {
  it("saves typed text onto the document from the box chrome", () => {
    render(<TextBoxEditor {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(props.onCommit).toHaveBeenCalled();
  });

  it("keeps the wrap placeholder readable", () => {
    render(<TextBoxEditor {...props} text="" />);
    const box = screen.getByPlaceholderText("Type here. Text wraps inside this box.");
    expect(box.className).toMatch(/placeholder:whitespace-normal/);
  });
});
