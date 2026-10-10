import { describe, expect, it } from "vitest";
import { COMMENT_COLORS, SHAPE_BORDER_PRESETS, SHAPE_FILL_PRESETS, commentNumber } from "./editorReview";

describe("shape text and comments", () => {
  it("numbers comment balloons in document order", () => {
    const anns = [
      { id: "a", type: "comment" },
      { id: "b", type: "text" },
      { id: "c", type: "comment" },
    ];
    expect(commentNumber(anns, "a")).toBe(1);
    expect(commentNumber(anns, "c")).toBe(2);
    expect(SHAPE_FILL_PRESETS.some((f) => f.label === "Ivory")).toBe(true);
    expect(SHAPE_BORDER_PRESETS.length).toBeGreaterThan(3);
    expect(COMMENT_COLORS.length).toBeGreaterThan(2);
  });
});
