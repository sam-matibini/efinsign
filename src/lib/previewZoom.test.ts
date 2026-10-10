import { describe, expect, it } from "vitest";
import { clampZoom, fitPagePercent, fitWidthPercent, resolveZoomPercent, stepZoom } from "./previewZoom";

describe("preview zoom", () => {
  it("fits the page width inside the preview pane", () => {
    expect(fitWidthPercent(1000, 918, 48)).toBeCloseTo(((1000 - 48) / 918) * 100, 5);
    expect(fitWidthPercent(400, 918, 48)).toBeGreaterThanOrEqual(30);
  });

  it("fits a full page when the pane is short", () => {
    const wide = fitWidthPercent(1200, 918, 48);
    const fitted = fitPagePercent(1200, 500, 918, 1188, 48, 24);
    expect(fitted).toBeLessThan(wide);
    expect(fitted).toBeGreaterThanOrEqual(30);
  });

  it("steps and clamps custom zoom", () => {
    expect(clampZoom(12)).toBe(50);
    expect(clampZoom(400)).toBe(250);
    expect(stepZoom(100, 1)).toBe(125);
    expect(stepZoom(50, -1)).toBe(50);
  });

  it("resolves fit modes from the visible page size", () => {
    const container = { width: 1100, height: 800 };
    const page = { width: 918, height: 1188 };
    expect(resolveZoomPercent("fit-width", 100, container, page)).toBe(fitWidthPercent(1100, 918));
    expect(resolveZoomPercent("custom", 140, container, page)).toBe(140);
  });
});
