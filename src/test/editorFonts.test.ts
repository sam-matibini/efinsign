import { describe, expect, it } from "vitest";
import { EDITOR_FONTS, editorFontCss, editorFontPdf } from "@/lib/editorFonts";
import { formatDisplayLines } from "@/lib/pendingText";

describe("editor fonts", () => {
  it("maps Word-like display fonts onto PDF standard families", () => {
    expect(EDITOR_FONTS.length).toBeGreaterThanOrEqual(10);
    expect(editorFontPdf("georgia")).toBe("times");
    expect(editorFontPdf("arial")).toBe("helvetica");
    expect(editorFontPdf("consolas")).toBe("courier");
    expect(editorFontCss("times")).toMatch(/Times/);
  });
});

describe("list formatting", () => {
  it("prefixes bullets and numbers without changing blank lines", () => {
    expect(formatDisplayLines("One\n\nTwo", "bullet")).toEqual(["• One", "", "• Two"]);
    expect(formatDisplayLines("One\nTwo", "number")).toEqual(["1. One", "2. Two"]);
  });
});
