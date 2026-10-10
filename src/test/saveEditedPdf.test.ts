import { describe, expect, it } from "vitest";
import { nextEditedPath } from "@/lib/saveEditedPdf";

describe("edited PDF storage path", () => {
  it("writes into the org folder so INSERT RLS still matches", () => {
    const org = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const path = nextEditedPath("old/user/file.pdf", org, "user-1");
    expect(path.startsWith(`${org}/user-1/`)).toBe(true);
    expect(path.endsWith("-edited.pdf")).toBe(true);
  });
});
