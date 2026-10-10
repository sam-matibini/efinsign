export const COMMENT_COLORS = [
  { label: "Amber", value: "#c2410c" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Teal", value: "#0f766e" },
  { label: "Rose", value: "#be123c" },
] as const;

export const SHAPE_FILL_PRESETS = [
  { label: "None", value: "none" },
  { label: "White", value: "#ffffff" },
  { label: "Ivory", value: "#f7f1e3" },
  { label: "Mist", value: "#e8eef2" },
  { label: "Sage", value: "#dce6dc" },
  { label: "Sky", value: "#dbeafe" },
  { label: "Gold", value: "#fde68a" },
  { label: "Navy", value: "#1e3a5f" },
] as const;

export const SHAPE_BORDER_PRESETS = [
  { label: "Ink", value: "#111827" },
  { label: "Navy", value: "#1e3a5f" },
  { label: "Royal", value: "#2563eb" },
  { label: "Crimson", value: "#b91c1c" },
  { label: "Forest", value: "#166534" },
  { label: "Gold", value: "#b45309" },
] as const;

export function commentNumber<T extends { type: string; id: string }>(annotations: T[], id: string) {
  return annotations.filter((a) => a.type === "comment").findIndex((a) => a.id === id) + 1;
}
