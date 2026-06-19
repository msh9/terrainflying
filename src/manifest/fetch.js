/**
 * Fetches a manifest document from URL, validates it, and returns both
 * the canonical manifest and resolved absolute manifest URL.
 */

import { validateManifest } from "./validate";
import { resolveManifestUrl } from "./urls";

export async function fetchManifest(manifestUrl, fetcher = fetch) {
  const resolvedUrl = resolveManifestUrl(manifestUrl);
  const response = await fetcher(resolvedUrl);
  if (!response.ok) {
    throw new Error(`Failed to load manifest (${response.status} ${response.statusText})`);
  }
  const data = await response.json();
  const manifest = validateManifest(data);
  return { manifest, manifestUrl: resolvedUrl };
}
