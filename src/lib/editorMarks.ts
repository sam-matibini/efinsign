export const DRAW_INK_COLORS = [
  { label: "Ink", value: "#111827" },
  { label: "Navy", value: "#1e3a5f" },
  { label: "Royal", value: "#2563eb" },
  { label: "Crimson", value: "#b91c1c" },
  { label: "Forest", value: "#166534" },
  { label: "Gold", value: "#b45309" },
  { label: "Violet", value: "#6d28d9" },
  { label: "White", value: "#f8fafc" },
] as const;

export const COVER_FINISHES = [
  { label: "Paper", value: "#fffefb", border: "#e4dfd4" },
  { label: "Ivory", value: "#f7f1e3", border: "#e0d4bc" },
  { label: "Parchment", value: "#efe6d5", border: "#d8c9aa" },
  { label: "Sand", value: "#e8dfd0", border: "#d0c3b0" },
  { label: "Mist", value: "#e8eef2", border: "#c5d0d8" },
  { label: "Slate", value: "#d9e0e6", border: "#b4c0c9" },
  { label: "Sage", value: "#dce6dc", border: "#b7c6b7" },
  { label: "Blush", value: "#f3e6e4", border: "#d8c4c0" },
  { label: "Navy", value: "#1e3a5f", border: "#16304d" },
  { label: "Charcoal", value: "#2f3438", border: "#1f2326" },
] as const;

export function coverFinish(color: string | null | undefined) {
  return COVER_FINISHES.find((f) => f.value === color) || COVER_FINISHES[0];
}

export function findInkBounds(data: Uint8ClampedArray, width: number, height: number, padding = 8) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function cropInkFromCanvas(canvas: HTMLCanvasElement, padding = 8) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height } = canvas;
  const bounds = findInkBounds(ctx.getImageData(0, 0, width, height).data, width, height, padding);
  if (!bounds) return null;
  const out = document.createElement("canvas");
  out.width = bounds.width;
  out.height = bounds.height;
  out.getContext("2d")?.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  return { ...bounds, imageData: out.toDataURL("image/png") };
}
