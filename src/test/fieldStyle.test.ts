import { describe, expect, it } from "vitest";
import { decodeFieldValue, encodeFieldValue } from "@/lib/fieldStyle";
import { nextUnfilledField, nextUnplacedType } from "@/lib/nextAction";

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
