export const MIN_ZOOM = 50;
export const MAX_ZOOM = 250;
export const ZOOM_STEP = 25;

export type ZoomMode = "fit-width" | "fit-page" | "custom";

export function clampZoom(percent: number): number {
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, percent)));
}

export function fitWidthPercent(containerWidth: number, pageWidth: number, gutter = 48): number {
  if (pageWidth <= 0 || containerWidth <= 0) return 100;
  return Math.max(30, ((containerWidth - gutter) / pageWidth) * 100);
}

export function fitPagePercent(
  containerWidth: number,
  containerHeight: number,
  pageWidth: number,
  pageHeight: number,
  gutter = 48,
  chrome = 24,
): number {
  const widthPct = fitWidthPercent(containerWidth, pageWidth, gutter);
  if (pageHeight <= 0 || containerHeight <= 0) return widthPct;
  const heightPct = ((containerHeight - chrome) / pageHeight) * 100;
  return Math.max(30, Math.min(widthPct, heightPct));
}

export function resolveZoomPercent(
  mode: ZoomMode,
  customPercent: number,
  container: { width: number; height: number },
  page: { width: number; height: number },
): number {
  if (mode === "fit-width") return fitWidthPercent(container.width, page.width);
  if (mode === "fit-page") {
    return fitPagePercent(container.width, container.height, page.width, page.height);
  }
  return clampZoom(customPercent);
}

export function stepZoom(current: number, direction: 1 | -1): number {
  return clampZoom(current + direction * ZOOM_STEP);
}
