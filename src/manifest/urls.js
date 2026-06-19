/**
 * Resolves manifest-relative and root-relative URLs into absolute URLs
 * so tile and archive assets load correctly from any manifest location.
 */

const DEFAULT_BASE =
  typeof window !== "undefined" && window.location ? window.location.href : "http://localhost/";

export function resolveManifestUrl(manifestUrl) {
  return new URL(manifestUrl, DEFAULT_BASE).toString();
}

export function resolveAssetUrl(url, manifestUrl) {
  const resolvedManifestUrl = resolveManifestUrl(manifestUrl);
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    const { origin } = new URL(resolvedManifestUrl);
    return `${origin}${url}`;
  }
  const baseUrl = new URL(".", resolvedManifestUrl).toString();
  return `${baseUrl}${url}`;
}

export function resolveTileUrlTemplate(template, manifestUrl) {
  return resolveAssetUrl(template, manifestUrl);
}
