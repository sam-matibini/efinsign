export interface AccountDetails {
  fullName: string;
  title: string;
  email: string;
  dateLabel: string;
}

export function titleStorageKey(userId: string): string {
  return `efinsign-account-title:${userId}`;
}

export function readAccountTitle(userId: string | null | undefined, metadataTitle?: string | null): string {
  if (userId && typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(titleStorageKey(userId));
      if (stored !== null) return stored;
    } catch {
      /* private mode */
    }
  }
  return (metadataTitle || "").trim();
}

export function writeAccountTitle(userId: string, title: string): void {
  try {
    localStorage.setItem(titleStorageKey(userId), title);
  } catch {
    /* private mode */
  }
}

export function formatAccountDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function buildAccountDetails(input: {
  fullName?: string | null;
  title?: string | null;
  email?: string | null;
  date?: Date;
}): AccountDetails {
  return {
    fullName: (input.fullName || "").trim(),
    title: (input.title || "").trim(),
    email: (input.email || "").trim(),
    dateLabel: formatAccountDate(input.date),
  };
}

export function isAccountHolder(email: string | null | undefined, accountEmail: string | null | undefined): boolean {
  if (!email || !accountEmail) return false;
  return email.trim().toLowerCase() === accountEmail.trim().toLowerCase();
}

export interface FieldValueOptions {
  signature?: string | null;
  initials?: string | null;
  typedText?: string | null;
  /** True when the field belongs to the logged-in account holder. */
  forAccountHolder: boolean;
  /** True when the user just confirmed text in the placement dialog. */
  useTypedText?: boolean;
}

/**
 * Value stamped onto a newly placed field.
 * Other signers keep their own fields blank so they complete them when they sign.
 */
export function accountFieldValue(
  fieldType: string,
  account: AccountDetails,
  options: FieldValueOptions,
): string | undefined {
  const typed = (options.typedText || "").trim();

  if (fieldType === "text") {
    return options.useTypedText && typed ? typed : undefined;
  }
  if (fieldType === "checkmark") return "✓";

  if (!options.forAccountHolder) return undefined;

  switch (fieldType) {
    case "full_name":
      return ((options.useTypedText ? typed : "") || account.fullName).trim() || undefined;
    case "title":
      return ((options.useTypedText ? typed : "") || account.title).trim() || undefined;
    case "date":
      return account.dateLabel;
    case "signature":
      return options.signature || undefined;
    case "initials":
      return options.initials || undefined;
    default:
      return undefined;
  }
}
