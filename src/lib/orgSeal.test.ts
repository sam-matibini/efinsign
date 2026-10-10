import { describe, expect, it } from "vitest";
import { markBounds } from "./orgSeal";

function paintCircle(width: number, height: number, radius: number, color: [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius;
      data[i] = inside ? color[0] : 6;
      data[i + 1] = inside ? color[1] : 20;
      data[i + 2] = inside ? color[2] : 122;
      data[i + 3] = 255;
    }
  }
  return data;
}

describe("seal logo mark bounds", () => {
  it("finds a circular gold mark on a navy tile so it can fill the inner disk", () => {
    const mark = markBounds(paintCircle(200, 200, 40, [198, 161, 91]), 200, 200);
    expect(mark.radius).toBeGreaterThan(38);
    expect(mark.radius).toBeLessThan(48);
  });

  it("keeps a full-bleed logo uncropped", () => {
    const mark = markBounds(paintCircle(100, 100, 70, [255, 255, 255]), 100, 100);
    expect(mark.radius).toBe(50);
  });
});
