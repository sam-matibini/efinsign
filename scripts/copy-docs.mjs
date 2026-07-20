import { promises as fs } from "node:fs";
import { join } from "node:path";

const src = join(import.meta.dirname, "..", "developers-portal", ".vitepress", "dist");
const dest = join(import.meta.dirname, "..", "dist", "developers");

try {
  await fs.cp(src, dest, { recursive: true });
  console.log("✓ Copied developer docs to dist/developers");
} catch (err) {
  console.error("✗ Failed to copy developer docs:", err.message);
}
