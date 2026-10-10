import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DragDrawCanvas from "./DragDrawCanvas";

describe("DragDrawCanvas", () => {
  it("completes a cover or highlight drag on the page you start on", () => {
    const onComplete = vi.fn();
    const onActivate = vi.fn();
    const { container } = render(
      <div style={{ width: 400, height: 300, position: "relative" }}>
        <DragDrawCanvas active onComplete={onComplete} onActivate={onActivate} />
      </div>,
    );
    const layer = container.querySelector(".absolute.inset-0") as HTMLElement;
    fireEvent.mouseDown(layer, { clientX: 20, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 120, clientY: 80 });
    fireEvent.mouseUp(window);
    expect(onActivate).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    const [x, y, w, h] = onComplete.mock.calls[0];
    expect(w).toBeGreaterThan(5);
    expect(h).toBeGreaterThan(5);
    expect(typeof x).toBe("number");
    expect(typeof y).toBe("number");
  });
});
