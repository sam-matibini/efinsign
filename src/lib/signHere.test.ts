import { describe, expect, it } from "vitest";
import { defaultSignHerePlacement, needsSignHereField } from "./signHere";

describe("sign here placement", () => {
  it("adds a signature box when the document has no sign field", () => {
    expect(needsSignHereField([])).toBe(true);
    expect(needsSignHereField([{ field_type: "date" }])).toBe(true);
    expect(needsSignHereField([{ field_type: "signature" }])).toBe(false);
  });

  it("places the box on the last page above the footer", () => {
    const box = defaultSignHerePlacement(16, 1188);
    expect(box.page_number).toBe(16);
    expect(box.width).toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(60);
    expect(box.y + box.height).toBeLessThan(1188);
    expect(box.y).toBeGreaterThan(800);
  });
});
