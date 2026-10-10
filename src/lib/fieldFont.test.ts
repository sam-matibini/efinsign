import { describe, expect, it } from "vitest";
import { fontSizeForFieldHeight, stepFieldHeight } from "./fieldFont";
import { checkAppearance, checkGlyph } from "./checkStyles";
import { COMPANY_SEALS, companySealSvg } from "./companySeals";

describe("fontSizeForFieldHeight", () => {
  it("grows when the field is taller", () => {
    expect(fontSizeForFieldHeight(48)).toBeGreaterThan(fontSizeForFieldHeight(30));
  });

  it("steps the box so the next font size is larger", () => {
    const next = stepFieldHeight(40, 1);
    expect(fontSizeForFieldHeight(next)).toBeGreaterThan(fontSizeForFieldHeight(40));
  });
});

describe("checkAppearance", () => {
  it("keeps a plain check and adds the other marks", () => {
    expect(checkAppearance("✓")).toEqual({ filled: true, style: "check" });
    expect(checkAppearance("style:box")).toEqual({ filled: false, style: "box" });
    expect(checkGlyph("cross")).toBe("✗");
    expect(checkGlyph("double")).toBe("✔✔");
  });
});

describe("company seals", () => {
  it("names eFinMoney and eFinTax Advisors Ltd on their seals", () => {
    expect(COMPANY_SEALS.map((s) => s.legalName)).toEqual(["eFinMoney", "eFinTax Advisors Ltd"]);
    expect(companySealSvg("efinmoney")).toContain("EFINMONEY");
    expect(companySealSvg("efintax")).toContain("EFINTAX ADVISORS LTD");
    expect(companySealSvg("efinmoney")).toContain("CORPORATE SEAL");
    expect(companySealSvg("efintax")).toContain("CORPORATE SEAL");
  });

  it("places a company logo icon in the center of the seal", () => {
    const svg = companySealSvg("efinmoney", "data:image/png;base64,aaa");
    expect(svg).toContain("<image href=\"data:image/png;base64,aaa\"");
    expect(svg).not.toContain(">eF<");
  });
});
