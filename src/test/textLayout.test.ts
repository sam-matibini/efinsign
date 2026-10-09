import { describe, expect, it } from "vitest";
import {
  alignedLineX,
  alignRectToPage,
  clampRect,
  nudgeRect,
  snapRect,
  wrapText,
} from "@/lib/textLayout";

const measure = (s: string) => s.length * 10;

describe("wrapText", () => {
  it("keeps a short line intact", () => {
    expect(wrapText("Hello", 100, measure)).toEqual(["Hello"]);
  });

  it("wraps words that exceed the box width", () => {
    expect(wrapText("one two three four", 70, measure)).toEqual(["one two", "three", "four"]);
  });

  it("preserves explicit new lines", () => {
    expect(wrapText("hello\nworld", 200, measure)).toEqual(["hello", "world"]);
  });

  it("breaks an oversized word", () => {
    expect(wrapText("abcdefghij", 40, measure)).toEqual(["abcd", "efgh", "ij"]);
  });
});

describe("snapRect", () => {
  it("sticks a box to another box's left edge", () => {
    const moved = snapRect({ x: 102, y: 10, w: 40, h: 20 }, [{ x: 100, y: 80, w: 80, h: 20 }], 400, 400, 8);
    expect(moved.x).toBe(100);
    expect(moved.guideV).toBe(100);
  });

  it("sticks to the page center", () => {
    const moved = snapRect({ x: 196, y: 10, w: 10, h: 10 }, [], 400, 400, 8);
    expect(moved.x).toBe(195);
    expect(moved.guideV).toBe(200);
  });
});

describe("nudge and align", () => {
  it("moves a box with arrow keys", () => {
    const r = { x: 20, y: 20, w: 40, h: 20 };
    expect(nudgeRect(r, "ArrowLeft", false, 400, 400).x).toBe(19);
    expect(nudgeRect(r, "ArrowDown", true, 400, 400).y).toBe(30);
  });

  it("aligns to the page", () => {
    const r = { x: 10, y: 10, w: 40, h: 20 };
    expect(alignRectToPage(r, "left", 400, 300).x).toBe(0);
    expect(alignRectToPage(r, "right", 400, 300).x).toBe(360);
    expect(alignRectToPage(r, "center", 400, 300).x).toBe(180);
  });

  it("clamps inside the page", () => {
    expect(clampRect({ x: -20, y: 500, w: 40, h: 20 }, 400, 300)).toEqual({ x: 0, y: 280, w: 40, h: 20 });
  });

  it("shifts wrapped lines for alignment", () => {
    expect(alignedLineX(0, 100, 40, "left")).toBe(0);
    expect(alignedLineX(0, 100, 40, "center")).toBe(30);
    expect(alignedLineX(0, 100, 40, "right")).toBe(60);
  });
});
