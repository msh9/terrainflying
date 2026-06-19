/**
 * Resolves the startup manifest URL from runtime configuration sources.
 * Precedence: query string > global config > document meta > default.
 */

export const DEFAULT_MANIFEST_URL = "/map-config.json";

const MANIFEST_QUERY_PARAM = "manifestUrl";
const MANIFEST_META_NAME = "flyer-manifest-url";

function getNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getConfiguredManifestUrl({
  search = typeof window !== "undefined" ? window.location.search : "",
  documentRef = typeof document !== "undefined" ? document : null,
  globalConfig = typeof window !== "undefined" ? window.FLYER_MAPS_CONFIG : null
} = {}) {
  const params = new URLSearchParams(search ?? "");
  const queryValue = getNonEmptyString(params.get(MANIFEST_QUERY_PARAM));
  if (queryValue) {
    return queryValue;
  }

  const globalValue = getNonEmptyString(globalConfig?.manifestUrl);
  if (globalValue) {
    return globalValue;
  }

  const metaValue = getNonEmptyString(
    documentRef?.querySelector(`meta[name="${MANIFEST_META_NAME}"]`)?.getAttribute("content")
  );
  if (metaValue) {
    return metaValue;
  }

  return DEFAULT_MANIFEST_URL;
}
