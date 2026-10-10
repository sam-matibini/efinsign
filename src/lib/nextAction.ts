export const FILL_NEXT_TYPES = ["signature", "initials", "text", "date"] as const;
export const EDITOR_NEXT_TOOLS = ["signature", "text"] as const;

export const FILL_NEXT_CHOICES = [
  { type: "auto", label: "Next action" },
  { type: "signature", label: "Signature" },
  { type: "initials", label: "Initials" },
  { type: "text", label: "Text" },
  { type: "full_name", label: "Full name" },
  { type: "title", label: "Title" },
  { type: "date", label: "Date" },
  { type: "checkmark", label: "Checkmark" },
] as const;

export const EDITOR_NEXT_CHOICES = [
  { type: "auto", label: "Next action" },
  { type: "signature", label: "Signature" },
  { type: "text", label: "Text" },
  { type: "stamp", label: "Seal / stamp" },
  { type: "checkmark", label: "Checkmark" },
] as const;

export function nextUnplacedType<T extends { field_type: string }>(
  fields: T[],
  order: readonly string[] = FILL_NEXT_TYPES,
): string {
  for (const type of order) {
    if (!fields.some((f) => f.field_type === type)) return type;
  }
  return order[0];
}

function looksLikeSeal<T extends { field_type: string; value?: string | null; localValue?: string | null }>(f: T) {
  const raw = `${f.field_type || ""} ${f.localValue || ""} ${f.value || ""}`;
  return f.field_type === "seal" || raw.includes("seal:");
}

export function nextUnfilledField<T extends { id: string; field_type: string; value?: string | null; localValue?: string | null }>(
  fields: T[],
  afterId?: string,
): T | null {
  const actionable = fields.filter((f) =>
    ["signature", "initials", "text", "date", "full_name", "title", "name"].includes(f.field_type)
    && !looksLikeSeal(f),
  );
  if (actionable.length === 0) return null;
  const filled = (f: T) => {
    const v = (f.localValue ?? f.value ?? "").trim();
    return v.length > 0;
  };
  const start = afterId ? actionable.findIndex((f) => f.id === afterId) + 1 : 0;
  for (let i = 0; i < actionable.length; i++) {
    const f = actionable[(start + i) % actionable.length];
    if (!filled(f) && f.id !== afterId) return f;
  }
  return null;
}

export function nextStepAfterStick<T extends { id: string; field_type: string; value?: string | null; localValue?: string | null }>(
  fields: T[],
  afterId?: string,
): { kind: "fill"; field: T } | { kind: "place"; type: string } {
  const unfilled = nextUnfilledField(fields, afterId);
  if (unfilled && unfilled.id !== afterId) return { kind: "fill", field: unfilled };
  return { kind: "place", type: nextUnplacedType(fields) };
}
