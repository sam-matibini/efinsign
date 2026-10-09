import type { MouseEvent } from "react";

export type ResizeDir = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

export const HANDLE_SIZE = 8;
export const MIN_SIZE = 24;

const CURSOR_MAP: Record<ResizeDir, string> = {
  nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize",
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
};

export function renderResizeHandles(
  w: number,
  h: number,
  onDown: (e: MouseEvent<HTMLDivElement>, dir: ResizeDir) => void,
) {
  const half = HANDLE_SIZE / 2;
  const positions: { dir: ResizeDir; left: number; top: number }[] = [
    { dir: "nw", left: -half, top: -half },
    { dir: "ne", left: w - half, top: -half },
    { dir: "sw", left: -half, top: h - half },
    { dir: "se", left: w - half, top: h - half },
    { dir: "n", left: w / 2 - half, top: -half },
    { dir: "s", left: w / 2 - half, top: h - half },
    { dir: "w", left: -half, top: h / 2 - half },
    { dir: "e", left: w - half, top: h / 2 - half },
  ];
  return positions.map(({ dir, left, top }) => (
    <div
      key={dir}
      className="absolute bg-primary border border-primary-foreground z-30"
      style={{
        left, top, width: HANDLE_SIZE, height: HANDLE_SIZE,
        cursor: CURSOR_MAP[dir], pointerEvents: "auto",
      }}
      onMouseDown={(e) => onDown(e, dir)}
    />
  ));
}
