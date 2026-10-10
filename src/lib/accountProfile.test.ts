import { describe, expect, it } from "vitest";
import { accountFieldValue, buildAccountDetails, isAccountHolder } from "./accountProfile";

const account = buildAccountDetails({
  fullName: "Sam Matibini",
  title: "Partner",
  email: "sam@example.com",
  date: new Date("2026-05-12T12:00:00"),
});

describe("accountFieldValue", () => {
  it("preloads the account holder's name, title, date, and signature", () => {
    const opts = { forAccountHolder: true, signature: "data:image/png;base64,abc" };
    expect(accountFieldValue("full_name", account, opts)).toBe("Sam Matibini");
    expect(accountFieldValue("title", account, opts)).toBe("Partner");
    expect(accountFieldValue("date", account, opts)).toContain("2026");
    expect(accountFieldValue("signature", account, opts)).toBe("data:image/png;base64,abc");
  });

  it("leaves another signer's identity fields blank", () => {
    const opts = { forAccountHolder: false, signature: "data:image/png;base64,abc" };
    expect(accountFieldValue("full_name", account, opts)).toBeUndefined();
    expect(accountFieldValue("title", account, opts)).toBeUndefined();
    expect(accountFieldValue("date", account, opts)).toBeUndefined();
    expect(accountFieldValue("signature", account, opts)).toBeUndefined();
  });

  it("uses typed text only after the placement dialog confirms it", () => {
    expect(accountFieldValue("text", account, { forAccountHolder: true, typedText: "Note", useTypedText: true })).toBe("Note");
    expect(accountFieldValue("text", account, { forAccountHolder: true, typedText: "Note", useTypedText: false })).toBeUndefined();
    expect(accountFieldValue("full_name", account, { forAccountHolder: true, typedText: "A. Name", useTypedText: true })).toBe("A. Name");
  });

  it("still places a checkmark for any signer", () => {
    expect(accountFieldValue("checkmark", account, { forAccountHolder: false })).toBe("✓");
  });
});

describe("isAccountHolder", () => {
  it("matches email regardless of case", () => {
    expect(isAccountHolder("Sam@Example.com", "sam@example.com")).toBe(true);
    expect(isAccountHolder("other@example.com", "sam@example.com")).toBe(false);
  });
});
