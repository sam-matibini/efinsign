import { describe, expect, it } from "vitest";
import { clampWatermarkSize, watermarkMetrics } from "@/lib/watermark";

describe("watermark size", () => {
  it("grows the watermark box when the size increases", () => {
    const small = watermarkMetrics(24);
    const large = watermarkMetrics(72);
    expect(large.fontSize).toBeGreaterThan(small.fontSize);
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.height).toBeGreaterThan(small.height);
    expect(clampWatermarkSize(4)).toBe(12);
    expect(clampWatermarkSize(400)).toBe(120);
  });
});
