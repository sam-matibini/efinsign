import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnnotationOverlay from "./AnnotationOverlay";
import type { ShapeAnnotation } from "./types";

function shape(text = ""): ShapeAnnotation {
  return {
    type: "shape",
    id: "shape-1",
    pageIndex: 0,
    x: 20,
    y: 20,
    width: 180,
    height: 80,
    shapeType: "rounded",
    strokeColor: "#2563eb",
    fillColor: "none",
    strokeWidth: 2,
    text,
  };
}

function renderOverlay(opts: { text?: string; editing?: boolean }) {
  const onUpdate = vi.fn();
  const onFinish = vi.fn();
  render(
    <div style={{ position: "relative", width: 400, height: 300 }}>
      <AnnotationOverlay
        annotations={[shape(opts.text)]}
        pageIndex={0}
        tool="select"
        selectedId="shape-1"
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
        editingShapeId={opts.editing ? "shape-1" : null}
        onFinishShapeEdit={onFinish}
      />
    </div>,
  );
  return { onUpdate, onFinish };
}

describe("shape inner text", () => {
  it("types inside the shape instead of opening a second text box", () => {
    const { onUpdate, onFinish } = renderOverlay({ text: "", editing: true });
    expect(screen.queryByText("Double-click to add text")).not.toBeInTheDocument();
    expect(document.querySelectorAll("textarea")).toHaveLength(1);
    const box = screen.getByPlaceholderText("Type inside this shape");
    fireEvent.change(box, { target: { value: "test text" } });
    expect(onUpdate).toHaveBeenCalledWith("shape-1", { text: "test text" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onFinish).toHaveBeenCalled();
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
  });

  it("keeps the empty hint readable and wraps normally", () => {
    renderOverlay({ text: "", editing: false });
    const hint = screen.getByText("Double-click to add text");
    expect(hint.className).toMatch(/whitespace-normal/);
    expect(hint.textContent).toBe("Double-click to add text");
  });

  it("shows committed text inside the shape", () => {
    renderOverlay({ text: "Board resolution", editing: false });
    expect(screen.getByText("Board resolution")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type inside this shape")).not.toBeInTheDocument();
  });
});
