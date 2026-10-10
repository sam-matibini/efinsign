import { PDFDocument, rgb, StandardFonts, degrees, type PDFPage } from "pdf-lib";
import { wrapTextToWidth } from "@/lib/textWrap";
import { alignedLineX } from "@/lib/textLayout";
import { editorFontPdf } from "@/lib/editorFonts";
import { formatDisplayLines } from "@/lib/pendingText";
import { companySealSvg, sealByStampLabel, svgToPngBytes } from "@/lib/companySeals";
import type { CheckStyle } from "@/lib/checkStyles";
import type { Annotation, PageState, HighlightAnnotation, ShapeAnnotation, ImageAnnotation, CheckmarkAnnotation, TextAnnotation, StampAnnotation, WhiteoutAnnotation, SignatureAnnotation, StickyNoteAnnotation } from "./types";

/** Helvetica/WinAnsi cannot encode many Unicode punctuation characters. */
export function toWinAnsi(text: string): string {
  return text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, (ch) => {
    const map: Record<string, string> = {
      "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"',
      "\u2013": "-", "\u2014": "-", "\u2026": "...", "\u00A0": " ",
    };
    return map[ch] ?? "?";
  });
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

export function drawCheckOnPage(page: PDFPage, style: CheckStyle, x: number, y: number, size: number) {
  const color = rgb(0.1, 0.45, 0.18);
  const borderWidth = Math.max(1.2, size / (style === "bold" || style === "double" ? 7 : 10));
  const scale = size / 24;
  const mark = (dx = 0) => page.drawSvgPath("M 2 12 L 9 19 L 22 5", {
    x: x + dx, y, borderColor: color, borderWidth, scale,
  });
  if (style === "cross") {
    page.drawLine({ start: { x, y: y - size }, end: { x: x + size, y }, color, thickness: borderWidth });
    page.drawLine({ start: { x, y }, end: { x: x + size, y: y - size }, color, thickness: borderWidth });
    return;
  }
  if (style === "box") {
    page.drawRectangle({ x, y: y - size, width: size, height: size, borderColor: color, borderWidth });
  }
  if (style === "circle") {
    page.drawEllipse({ x: x + size / 2, y: y - size / 2, xScale: size / 2, yScale: size / 2, borderColor: color, borderWidth });
  }
  mark();
  if (style === "double") mark(size * 0.55);
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
  const helvetica = await newDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await newDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await newDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await newDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const times = await newDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await newDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await newDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBoldItalic = await newDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const courier = await newDoc.embedFont(StandardFonts.Courier);
  const courierBold = await newDoc.embedFont(StandardFonts.CourierBold);
  const courierOblique = await newDoc.embedFont(StandardFonts.CourierOblique);
  const courierBoldOblique = await newDoc.embedFont(StandardFonts.CourierBoldOblique);
  const boldFont = helveticaBold;

  const pickFont = (family: TextAnnotation["fontFamily"], bold?: boolean, italic?: boolean) => {
    const pdf = editorFontPdf(family);
    if (pdf === "times") {
      if (bold && italic) return timesBoldItalic;
      if (italic) return timesItalic;
      return bold ? timesBold : times;
    }
    if (pdf === "courier") {
      if (bold && italic) return courierBoldOblique;
      if (italic) return courierOblique;
      return bold ? courierBold : courier;
    }
    if (bold && italic) return helveticaBoldOblique;
    if (italic) return helveticaOblique;
    return bold ? helveticaBold : helvetica;
  };

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
        const scale = pw / cw;
        const size = Math.max(6, (ta.fontSize || 14) * scale);
        const textFont = pickFont(ta.fontFamily, ta.bold, ta.italic);
        const color = ta.color && /^#[0-9a-fA-F]{6}$/.test(ta.color) ? hexToRgb(ta.color) : rgb(0, 0, 0);
        const maxW = ((ta.width && ta.width > 0 ? ta.width : 240) / cw) * pw;
        const boxH = ((ta.height && ta.height > 0 ? ta.height : 40) / ch) * ph;
        const display = formatDisplayLines(ta.text || "", ta.listStyle).join("\n");
        const safeText = toWinAnsi(display);
        const lines = wrapTextToWidth(safeText, maxW, (sample) => textFont.widthOfTextAtSize(sample, size));
        const lineHeight = size * (ta.lineHeight ?? 1.25);
        if (ta.backgroundColor && /^#[0-9a-fA-F]{6}$/.test(ta.backgroundColor)) {
          page.drawRectangle({
            x: toPdfX(ta.x),
            y: toPdfY(ta.y) - boxH,
            width: maxW,
            height: boxH,
            color: hexToRgb(ta.backgroundColor),
            opacity: ta.opacity ?? 1,
            borderWidth: 0,
          });
        }
        lines.forEach((line, i) => {
          if (!line) return;
          const lineWidth = textFont.widthOfTextAtSize(line, size);
          const x = alignedLineX(toPdfX(ta.x), maxW, lineWidth, ta.align ?? "left");
          const y = toPdfY(ta.y) - size * 0.82 - i * lineHeight;
          page.drawText(line, {
            x,
            y,
            size,
            font: textFont,
            color,
            opacity: ta.opacity ?? 1,
            ...(ta.rotate ? { rotate: degrees(ta.rotate) } : {}),
          });
          if (ta.underline) {
            page.drawLine({
              start: { x, y: y - size * 0.12 },
              end: { x: x + lineWidth, y: y - size * 0.12 },
              color,
              thickness: Math.max(0.6, size * 0.06),
              opacity: ta.opacity ?? 1,
            });
          }
          if (ta.strikethrough) {
            page.drawLine({
              start: { x, y: y + size * 0.28 },
              end: { x: x + lineWidth, y: y + size * 0.28 },
              color,
              thickness: Math.max(0.6, size * 0.06),
              opacity: ta.opacity ?? 1,
            });
          }
        });
        break;
      }
      case "whiteout": {
        const wa = ann as WhiteoutAnnotation;
        page.drawRectangle({
          x: toPdfX(wa.x),
          y: toPdfY(wa.y + wa.height),
          width: (wa.width / cw) * pw,
          height: (wa.height / ch) * ph,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });
        break;
      }
      case "stamp": {
        const sa = ann as StampAnnotation;
        const seal = sealByStampLabel(sa.label);
        if (seal) {
          const png = await svgToPngBytes(companySealSvg(seal.id));
          const image = await newDoc.embedPng(png);
          const sw = ((sa.width || 150) / cw) * pw;
          const sh = ((sa.height || 150) / ch) * ph;
          page.drawImage(image, { x: toPdfX(sa.x), y: toPdfY(sa.y + (sa.height || 150)), width: sw, height: sh });
          break;
        }
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
        drawCheckOnPage(page, ca.style || "check", cx, cy, s);
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
        } else if (sha.shapeType === "rounded") {
          page.drawRectangle({
            x: sx, y: sy, width: sw, height: sh,
            borderColor: strokeC, borderWidth: sha.strokeWidth, color: fillC, opacity: fillC ? 1 : 0,
          });
        } else if (sha.shapeType === "circle" || sha.shapeType === "ellipse") {
          page.drawEllipse({
            x: sx + sw / 2, y: sy + sh / 2,
            xScale: sw / 2, yScale: sh / 2,
            borderColor: strokeC, borderWidth: sha.strokeWidth,
            color: fillC, opacity: fillC ? 1 : 0,
          });
        } else if (sha.shapeType === "triangle") {
          page.drawSvgPath(`M ${sw / 2} ${sh} L ${sw} 0 L 0 0 Z`, {
            x: sx, y: sy, borderColor: strokeC, borderWidth: sha.strokeWidth, color: fillC, opacity: fillC ? 1 : 0,
          });
        } else if (sha.shapeType === "diamond") {
          page.drawSvgPath(`M ${sw / 2} ${sh} L ${sw} ${sh / 2} L ${sw / 2} 0 L 0 ${sh / 2} Z`, {
            x: sx, y: sy, borderColor: strokeC, borderWidth: sha.strokeWidth, color: fillC, opacity: fillC ? 1 : 0,
          });
        } else if (sha.shapeType === "arrow") {
          const mid = sh / 2;
          page.drawLine({ start: { x: sx, y: sy + mid }, end: { x: sx + sw * 0.72, y: sy + mid }, color: strokeC, thickness: sha.strokeWidth });
          page.drawSvgPath(`M ${sw * 0.68} ${sh * 0.18} L ${sw} ${sh / 2} L ${sw * 0.68} ${sh * 0.82} Z`, {
            x: sx, y: sy, color: strokeC, borderColor: strokeC, borderWidth: 0.5,
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
      case "signature": {
        const sig = ann as SignatureAnnotation;
        const ix = toPdfX(sig.x);
        const iy = toPdfY(sig.y + sig.height);
        const iw = (sig.width / cw) * pw;
        const ih = (sig.height / ch) * ph;
        if (sig.imageData) {
          const imgBytes = await fetch(sig.imageData).then((r) => r.arrayBuffer());
          const img = await newDoc.embedPng(imgBytes);
          page.drawImage(img, { x: ix, y: iy, width: iw, height: ih });
        } else {
          page.drawRectangle({
            x: ix, y: iy, width: iw, height: ih,
            borderColor: rgb(0.35, 0.4, 0.5),
            borderWidth: 1,
            color: rgb(0.97, 0.98, 1),
            opacity: 0.55,
          });
          page.drawLine({
            start: { x: ix + 8, y: iy + 10 },
            end: { x: ix + iw - 8, y: iy + 10 },
            color: rgb(0.2, 0.25, 0.35),
            thickness: 0.8,
          });
          page.drawText("Sign here", {
            x: ix + 8, y: iy + ih - 14, size: Math.min(10, ih * 0.28),
            font: helvetica, color: rgb(0.35, 0.4, 0.5),
          });
        }
        break;
      }
      case "sticky": {
        const note = ann as StickyNoteAnnotation;
        const nx = toPdfX(note.x);
        const ny = toPdfY(note.y + note.height);
        const nw = (note.width / cw) * pw;
        const nh = (note.height / ch) * ph;
        const bg = note.color && /^#[0-9a-fA-F]{6}$/.test(note.color) ? hexToRgb(note.color) : rgb(1, 0.92, 0.35);
        page.drawRectangle({ x: nx, y: ny, width: nw, height: nh, color: bg, borderColor: rgb(0.72, 0.58, 0.12), borderWidth: 0.8 });
        page.drawText("NEXT", {
          x: nx + 6, y: ny + nh - 12, size: 8, font: helveticaBold, color: rgb(0.45, 0.28, 0.05),
        });
        const noteLines = wrapTextToWidth(toWinAnsi(note.text || ""), nw - 10, (s) => helvetica.widthOfTextAtSize(s, 8));
        noteLines.slice(0, 6).forEach((line, i) => {
          if (!line) return;
          page.drawText(line, {
            x: nx + 6, y: ny + nh - 24 - i * 10, size: 8, font: helvetica, color: rgb(0.2, 0.15, 0.05),
          });
        });
        break;
      }
    }
  }

  return await newDoc.save();
}
