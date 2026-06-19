import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findForbiddenDistEntries } from "./dist-artifact-rules.js";

function walkFiles(rootDir, currentDir = rootDir) {
  const entries = readdirSync(currentDir);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(rootDir, absolutePath));
      continue;
    }
    files.push(path.relative(rootDir, absolutePath));
  }

  return files;
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const distDir = path.join(projectRoot, "dist");

if (!existsSync(distDir)) {
  console.error("Distribution directory was not found. Run `npm run build` before verification.");
  process.exit(1);
}

const distFiles = walkFiles(distDir);
const violations = findForbiddenDistEntries(distFiles);

if (violations.length > 0) {
  console.error("Forbidden files were found in dist output:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Dist verification passed (${distFiles.length} files).`);
