import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "developers-portal", ".vitepress", "dist");
const dest = join(__dirname, "..", "dist", "developers");

try {
  await fs.cp(src, dest, { recursive: true });
  console.log("✓ Copied developer docs to dist/developers");
} catch (err) {
  console.error("✗ Failed to copy developer docs:", err.message);
}
