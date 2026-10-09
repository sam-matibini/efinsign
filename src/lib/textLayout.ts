export type TextAlign = "left" | "center" | "right";

export type Rect = { x: number; y: number; w: number; h: number };

export const SNAP_THRESHOLD = 8;
export const NUDGE_STEP = 1;
export const NUDGE_STEP_LARGE = 10;
export const DEFAULT_TEXT_BOX_WIDTH = 240;

export function defaultTextBoxHeight(fontSize: number): number {
  return Math.max(40, Math.round(fontSize * 2.6));
}

export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para === "") {
      lines.push("");
      continue;
    }
    if (maxWidth <= 0) {
      lines.push(para);
      continue;
    }

    const words = para.split(/\s+/);
    let current = "";

    const pushOverflowWord = (word: string) => {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (measure(next) <= maxWidth || chunk.length === 0) {
          chunk = next;
        } else {
          lines.push(chunk);
          chunk = ch;
        }
      }
      return chunk;
    };

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (measure(word) <= maxWidth) {
        current = word;
      } else {
        current = pushOverflowWord(word);
      }
    }
    if (current) lines.push(current);
  }

  return lines.length ? lines : [""];
}

function nearestTarget(
  value: number,
  targets: number[],
  threshold: number,
): { snapped: number; guide: number | null; dist: number } {
  let best = value;
  let guide: number | null = null;
  let dist = threshold + 1;
  for (const t of targets) {
    const d = Math.abs(value - t);
    if (d <= threshold && d < dist) {
      dist = d;
      best = t;
      guide = t;
    }
  }
  return { snapped: best, guide, dist };
}

export function alignmentTargets(others: Rect[], pageW: number, pageH: number): { xs: number[]; ys: number[] } {
  const xs = [0, pageW / 2, pageW];
  const ys = [0, pageH / 2, pageH];
  for (const o of others) {
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  return { xs, ys };
}

export function snapRect(
  rect: Rect,
  others: Rect[],
  pageW: number,
  pageH: number,
  threshold = SNAP_THRESHOLD,
): { x: number; y: number; guideV: number | null; guideH: number | null } {
  const { xs, ys } = alignmentTargets(others, pageW, pageH);

  const left = nearestTarget(rect.x, xs, threshold);
  const cx = nearestTarget(rect.x + rect.w / 2, xs, threshold);
  const right = nearestTarget(rect.x + rect.w, xs, threshold);
  const xPick = [left, cx, right].sort((a, b) => a.dist - b.dist)[0];
  let x = rect.x;
  let guideV: number | null = null;
  if (xPick.guide !== null) {
    if (xPick === left) x = xPick.snapped;
    else if (xPick === cx) x = xPick.snapped - rect.w / 2;
    else x = xPick.snapped - rect.w;
    guideV = xPick.guide;
  }

  const top = nearestTarget(rect.y, ys, threshold);
  const cy = nearestTarget(rect.y + rect.h / 2, ys, threshold);
  const bottom = nearestTarget(rect.y + rect.h, ys, threshold);
  const yPick = [top, cy, bottom].sort((a, b) => a.dist - b.dist)[0];
  let y = rect.y;
  let guideH: number | null = null;
  if (yPick.guide !== null) {
    if (yPick === top) y = yPick.snapped;
    else if (yPick === cy) y = yPick.snapped - rect.h / 2;
    else y = yPick.snapped - rect.h;
    guideH = yPick.guide;
  }

  return { x, y, guideV, guideH };
}

export function clampRect(rect: Rect, pageW: number, pageH: number): Rect {
  const w = Math.min(rect.w, pageW);
  const h = Math.min(rect.h, pageH);
  return {
    w,
    h,
    x: Math.min(Math.max(0, rect.x), Math.max(0, pageW - w)),
    y: Math.min(Math.max(0, rect.y), Math.max(0, pageH - h)),
  };
}

export function nudgeRect(rect: Rect, key: string, large: boolean, pageW: number, pageH: number): Rect {
  const step = large ? NUDGE_STEP_LARGE : NUDGE_STEP;
  const next = { ...rect };
  if (key === "ArrowUp") next.y -= step;
  else if (key === "ArrowDown") next.y += step;
  else if (key === "ArrowLeft") next.x -= step;
  else if (key === "ArrowRight") next.x += step;
  else return rect;
  return clampRect(next, pageW, pageH);
}

export function alignRectToPage(
  rect: Rect,
  align: "left" | "center" | "right" | "top" | "middle" | "bottom",
  pageW: number,
  pageH: number,
): Rect {
  const next = { ...rect };
  if (align === "left") next.x = 0;
  if (align === "center") next.x = (pageW - rect.w) / 2;
  if (align === "right") next.x = pageW - rect.w;
  if (align === "top") next.y = 0;
  if (align === "middle") next.y = (pageH - rect.h) / 2;
  if (align === "bottom") next.y = pageH - rect.h;
  return clampRect(next, pageW, pageH);
}

export function alignedLineX(boxX: number, boxWidth: number, lineWidth: number, align: TextAlign): number {
  if (align === "center") return boxX + (boxWidth - lineWidth) / 2;
  if (align === "right") return boxX + boxWidth - lineWidth;
  return boxX;
}
