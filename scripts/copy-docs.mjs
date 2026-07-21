import { promises as fs, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "developers-portal", ".vitepress", "dist");
const dest = join(__dirname, "..", "dist", "developers");

try {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    await fs.cp(srcPath, destPath, { recursive: true });
  }

  if (existsSync(join(dest, "index.html"))) {
    console.log("✓ Copied developer docs to dist/developers");
  } else {
    console.error("✗ Copy completed but dist/developers/index.html is missing");
    process.exit(1);
  }
} catch (err) {
  console.error("✗ Failed to copy developer docs:", err.message);
  process.exit(1);
}
