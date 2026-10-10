import * as pdfjsLib from "pdfjs-dist";

export const SIGN_HERE_WIDTH = 260;
export const SIGN_HERE_HEIGHT = 88;
export const LOCAL_SIGN_HERE_ID = "local-sign-here";

export function needsSignHereField(fields: { field_type: string }[]): boolean {
  return !fields.some((field) => field.field_type === "signature");
}

export function defaultSignHerePlacement(pageNumber: number, pageHeight = 1188) {
  return {
    page_number: Math.max(1, pageNumber),
    x: 72,
    y: Math.max(80, pageHeight - SIGN_HERE_HEIGHT - 96),
    width: SIGN_HERE_WIDTH,
    height: SIGN_HERE_HEIGHT,
  };
}

export async function countPdfPages(url: string): Promise<number> {
  const pdf = await pdfjsLib.getDocument(url).promise;
  const count = pdf.numPages;
  pdf.destroy();
  return count;
}

export function isLocalSignHere(id: string): boolean {
  return id === LOCAL_SIGN_HERE_ID || id.startsWith("local-sign-here");
}
