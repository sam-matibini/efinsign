import { describe, expect, it } from "vitest";

function nextEditedPath(filePath: string): string {
  const slash = filePath.lastIndexOf("/");
  const folder = slash >= 0 ? filePath.slice(0, slash + 1) : "";
  return `${folder}${Date.now()}-edited.pdf`;
}

describe("edited PDF storage path", () => {
  it("keeps the org folder prefix so INSERT RLS still matches", () => {
    const path = nextEditedPath("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/user/file.pdf");
    expect(path.startsWith("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/user/")).toBe(true);
    expect(path.endsWith("-edited.pdf")).toBe(true);
  });
});
