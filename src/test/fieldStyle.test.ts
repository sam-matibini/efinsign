import { describe, expect, it } from "vitest";
import { decodeFieldValue, encodeFieldValue } from "@/lib/fieldStyle";
import { nextUnfilledField, nextUnplacedType } from "@/lib/nextAction";
import { isSealField, sealFromField } from "@/lib/companySeals";

describe("field style encoding", () => {
  it("round-trips Word formatting without breaking plain text", () => {
    expect(decodeFieldValue("Hello").text).toBe("Hello");
    const packed = encodeFieldValue("Sam Matibini", { bold: true, italic: true, fontFamily: "georgia", color: "#1e3a5f" });
    const decoded = decodeFieldValue(packed);
    expect(decoded.text).toBe("Sam Matibini");
    expect(decoded.style.bold).toBe(true);
    expect(decoded.style.fontFamily).toBe("georgia");
  });
});

describe("seal fields stored as text", () => {
  it("recognizes fallback text values as company seals, not wrap text", () => {
    const stored = { field_type: "text", value: "seal:efinmoney" };
    expect(isSealField(stored)).toBe(true);
    expect(sealFromField(stored)?.id).toBe("efinmoney");
    expect(isSealField({ field_type: "seal", value: "seal:efintax" })).toBe(true);
    expect(isSealField({ field_type: "text", value: "Hello" })).toBe(false);
    const packed = encodeFieldValue("seal:efinmoney", { bold: true });
    expect(isSealField({ field_type: "text", value: packed })).toBe(true);
    expect(sealFromField({ field_type: "text", value: packed })?.id).toBe("efinmoney");
  });

  it("skips seal-as-text when picking the next field to fill", () => {
    const next = nextUnfilledField([
      { id: "seal", field_type: "text", value: "seal:efinmoney" },
      { id: "name", field_type: "text", value: "" },
    ]);
    expect(next?.id).toBe("name");
  });
});

describe("next action", () => {
  it("picks the next missing field type then the next empty field", () => {
    expect(nextUnplacedType([{ field_type: "signature" }])).toBe("initials");
    const next = nextUnfilledField([
      { id: "a", field_type: "signature", value: "data:image/png;base64,xx" },
      { id: "b", field_type: "text", value: "" },
    ]);
    expect(next?.id).toBe("b");
  });
});
