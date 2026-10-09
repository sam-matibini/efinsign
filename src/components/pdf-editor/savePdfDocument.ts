import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Annotation, PageState, HighlightAnnotation, ShapeAnnotation, ImageAnnotation, CheckmarkAnnotation, TextAnnotation, StampAnnotation } from "./types";

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

export async function savePdfDocument(
  pdfUrl: string,
  pages: PageState[],
  annotations: Annotation[],
  canvasRefs: Map<number, HTMLCanvasElement>
) {
  const existingPdfBytes = await fetch(pdfUrl).then((r) => r.arrayBuffer());
  const srcDoc = await PDFDocument.load(existingPdfBytes);
  const newDoc = await PDFDocument.create();
  const font = await newDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await newDoc.embedFont(StandardFonts.HelveticaBold);

  const activePages = pages.filter((p) => !p.deleted);
  for (const ps of activePages) {
    const [copied] = await newDoc.copyPages(srcDoc, [ps.pageNum - 1]);
    newDoc.addPage(copied);
  }

  const pdfPages = newDoc.getPages();

  for (const ann of annotations) {
    const origPage = pages[ann.pageIndex];
    if (!origPage || origPage.deleted) continue;
    const newPageIdx = activePages.indexOf(origPage);
    if (newPageIdx < 0) continue;
    const page = pdfPages[newPageIdx];
    if (!page) continue;
    const { width: pw, height: ph } = page.getSize();
    const canvas = canvasRefs.get(origPage.pageNum);
    const cw = canvas?.width || pw * 1.5;
    const ch = canvas?.height || ph * 1.5;

    const toPdfX = (x: number) => (x / cw) * pw;
    const toPdfY = (y: number) => ph - (y / ch) * ph;

    switch (ann.type) {
      case "text": {
        const ta = ann as TextAnnotation;
        page.drawText(ta.text, { x: toPdfX(ta.x), y: toPdfY(ta.y), size: ta.fontSize, font, color: rgb(0, 0, 0) });
        break;
      }
      case "stamp": {
        const sa = ann as StampAnnotation;
        page.drawText(sa.label.toUpperCase(), {
          x: toPdfX(sa.x), y: toPdfY(sa.y), size: 36, font: boldFont,
          color: rgb(0.8, 0.1, 0.1), opacity: 0.4,
        });
        break;
      }
      case "drawing": {
        if (ann.imageData) {
          const pngBytes = await fetch(ann.imageData).then((r) => r.arrayBuffer());
          const pngImage = await newDoc.embedPng(pngBytes);
          page.drawImage(pngImage, { x: 0, y: 0, width: pw, height: ph, opacity: 1 });
        }
        break;
      }
      case "checkmark": {
        const ca = ann as CheckmarkAnnotation;
        const cx = toPdfX(ca.x);
        const cy = toPdfY(ca.y);
        const s = (ca.size / ch) * ph;
        page.drawSvgPath("M 2 12 L 9 19 L 22 5", {
          x: cx,
          y: cy,
          borderColor: rgb(0.13, 0.55, 0.13),
          borderWidth: Math.max(1.5, s / 8),
          scale: s / 24,
        });
        break;
      }
      case "highlight": {
        const ha = ann as HighlightAnnotation;
        const hColor = hexToRgb(ha.color);
        const hx = toPdfX(ha.x);
        const hy = toPdfY(ha.y + ha.height);
        const hw = (ha.width / cw) * pw;
        const hh = (ha.height / ch) * ph;
        page.drawRectangle({ x: hx, y: hy, width: hw, height: hh, color: hColor, opacity: ha.opacity, borderWidth: 0 });
        break;
      }
      case "shape": {
        const sha = ann as ShapeAnnotation;
        const sx = toPdfX(sha.x);
        const sy = toPdfY(sha.y + sha.height);
        const sw = (sha.width / cw) * pw;
        const sh = (sha.height / ch) * ph;
        const strokeC = hexToRgb(sha.strokeColor);
        const fillC = sha.fillColor === "none" ? undefined : hexToRgb(sha.fillColor);

        if (sha.shapeType === "rect") {
          page.drawRectangle({ x: sx, y: sy, width: sw, height: sh, borderColor: strokeC, borderWidth: sha.strokeWidth, color: fillC, opacity: fillC ? 1 : 0 });
        } else if (sha.shapeType === "circle") {
          page.drawEllipse({
            x: sx + sw / 2, y: sy + sh / 2,
            xScale: sw / 2, yScale: sh / 2,
            borderColor: strokeC, borderWidth: sha.strokeWidth,
            color: fillC, opacity: fillC ? 1 : 0,
          });
        } else {
          page.drawLine({ start: { x: sx, y: sy + sh / 2 }, end: { x: sx + sw, y: sy + sh / 2 }, color: strokeC, thickness: sha.strokeWidth });
        }
        break;
      }
      case "image": {
        const ia = ann as ImageAnnotation;
        const imgBytes = await fetch(ia.imageData).then((r) => r.arrayBuffer());
        const isPng = ia.imageData.includes("image/png");
        const img = isPng ? await newDoc.embedPng(imgBytes) : await newDoc.embedJpg(imgBytes);
        const ix = toPdfX(ia.x);
        const iy = toPdfY(ia.y + ia.height);
        const iw = (ia.width / cw) * pw;
        const ih = (ia.height / ch) * ph;
        page.drawImage(img, { x: ix, y: iy, width: iw, height: ih });
        break;
      }
    }
  }

  return await newDoc.save();
}
