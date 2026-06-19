const FORBIDDEN_DIRECTORY_PREFIXES = ["fixtures", "tiles", "tests"];
const FORBIDDEN_ROOT_FILES = new Set(["map-harness.html", "test-harness.html"]);

function normalizeDistEntry(entry) {
  return entry
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^\.\/+/, "");
}

export function findForbiddenDistEntries(entries) {
  const violations = [];

  for (const entry of entries) {
    const normalized = normalizeDistEntry(entry);
    if (!normalized) {
      continue;
    }

    if (FORBIDDEN_ROOT_FILES.has(normalized)) {
      violations.push(normalized);
      continue;
    }

    const hasForbiddenDirectoryPrefix = FORBIDDEN_DIRECTORY_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
    );
    if (hasForbiddenDirectoryPrefix) {
      violations.push(normalized);
    }
  }

  return [...new Set(violations)].sort();
}
