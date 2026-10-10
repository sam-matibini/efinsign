export function clampWatermarkSize(size: number) {
  return Math.min(120, Math.max(12, Math.round(size)));
}

export function watermarkMetrics(fontSize: number) {
  const size = clampWatermarkSize(fontSize);
  return {
    fontSize: size,
    width: Math.max(220, Math.round(size * 9.5)),
    height: Math.max(32, Math.round(size * 1.5)),
  };
}
