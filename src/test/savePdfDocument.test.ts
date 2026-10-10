import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { savePdfDocument, toWinAnsi } from "@/components/pdf-editor/savePdfDocument";
import type { TextAnnotation } from "@/components/pdf-editor/types";

function inflatePdfStrings(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  let inflated = raw;
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try {
      inflated += inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
    } catch {
      /* ignore non-flate streams */
    }
  }
  return inflated;
}

describe("savePdfDocument text", () => {
  it("encodes punctuation so Helvetica can draw the line", () => {
    expect(toWinAnsi("Don’t — “quote”")).toBe("Don't - \"quote\"");
  });

  it("burns added text into the saved PDF bytes", async () => {
    const src = await PDFDocument.create();
    src.addPage([612, 792]);
    const bytes = await src.save();
    const url = `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`;
    const canvases = new Map<number, HTMLCanvasElement>([
      [1, { width: 918, height: 1188 } as HTMLCanvasElement],
    ]);
    const text: TextAnnotation = {
      type: "text",
      id: "t1",
      pageIndex: 0,
      x: 72,
      y: 220,
      text: "Hello eFinSign edit",
      fontSize: 16,
      width: 260,
      height: 40,
    };
    const saved = await savePdfDocument(url, [{ pageNum: 1, deleted: false }], [text], canvases);
    const content = inflatePdfStrings(saved);
    const hexText = [...content.matchAll(/<([0-9A-Fa-f]+)> Tj/g)]
      .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
      .join("");
    expect(hexText).toContain("Hello eFinSign edit");
  });
});
