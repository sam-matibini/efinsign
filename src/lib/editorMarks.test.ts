import { describe, expect, it } from "vitest";
import { COVER_FINISHES, DRAW_INK_COLORS, coverFinish, findInkBounds } from "./editorMarks";

describe("draw and cover marks", () => {
  it("offers several ink colors and professional cover finishes", () => {
    expect(DRAW_INK_COLORS.length).toBeGreaterThanOrEqual(6);
    expect(COVER_FINISHES.map((f) => f.label)).toEqual(expect.arrayContaining(["Paper", "Ivory", "Parchment", "Navy"]));
    expect(coverFinish("#f7f1e3").label).toBe("Ivory");
  });

  it("crops a stroke to the ink bounds so it can be moved and deleted", () => {
    const width = 20;
    const height = 20;
    const data = new Uint8ClampedArray(width * height * 4);
    const paint = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      data[i] = 17;
      data[i + 1] = 24;
      data[i + 2] = 39;
      data[i + 3] = 255;
    };
    paint(8, 9);
    paint(9, 9);
    paint(10, 10);
    const bounds = findInkBounds(data, width, height, 1);
    expect(bounds).toEqual({ x: 7, y: 8, width: 5, height: 4 });
  });
});
