import { describe, expect, it } from "vitest";
import { textAnnotationFromEditor, withPendingText } from "@/lib/pendingText";

describe("pending editor text", () => {
  it("builds a text annotation from the open editor", () => {
    const ann = textAnnotationFromEditor({
      pageIndex: 2,
      x: 40,
      y: 80,
      text: "  Added on the form  ",
      fontSize: 14,
      color: "#111827",
      fontFamily: "helvetica",
      bold: false,
    });
    expect(ann?.text).toBe("Added on the form");
    expect(ann?.pageIndex).toBe(2);
    expect(ann?.width).toBeGreaterThan(0);
  });

  it("merges pending text into the list used for Save", () => {
    const existing = [{ id: "a", text: "old" }];
    const pending = { id: "b", text: "new" };
    expect(withPendingText(existing, pending)).toEqual([
      { id: "a", text: "old" },
      { id: "b", text: "new" },
    ]);
  });
});
