import { describe, expect, it } from "vitest";
import { estimateWrappedHeight, wrapTextToWidth } from "./textWrap";

const charWidth = (sample: string) => sample.length * 10;

describe("wrapTextToWidth", () => {
  it("keeps a short line intact", () => {
    expect(wrapTextToWidth("Hello", 100, charWidth)).toEqual(["Hello"]);
  });

  it("wraps long text onto more than one line", () => {
    const lines = wrapTextToWidth("alpha bravo charlie delta", 120, charWidth);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe("alpha bravo charlie delta");
    for (const line of lines) expect(charWidth(line)).toBeLessThanOrEqual(120);
  });

  it("preserves explicit line breaks", () => {
    expect(wrapTextToWidth("one\ntwo", 200, charWidth)).toEqual(["one", "two"]);
  });

  it("splits a single word that is wider than the box", () => {
    const lines = wrapTextToWidth("ABCDEFGHIJ", 40, charWidth);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe("ABCDEFGHIJ");
  });
});

describe("estimateWrappedHeight", () => {
  it("grows when the text needs more lines", () => {
    const short = estimateWrappedHeight("Hi", 14, 240);
    const long = estimateWrappedHeight("This sentence is long enough to wrap inside the text box", 14, 80);
    expect(long).toBeGreaterThan(short);
  });
});
