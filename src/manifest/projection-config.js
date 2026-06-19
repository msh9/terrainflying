/**
 * Builds stable projection identity data from manifest CRS definitions.
 * The resulting code is deterministic for a CRS definition string.
 */

function asNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function hashStringFnv1a(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getManifestProjectionDefinition(manifest) {
  const definition =
    asNonEmptyString(manifest?.crs?.wgs84Transform) || asNonEmptyString(manifest?.crs?.value);
  if (!definition) {
    throw new Error("Manifest CRS definition missing.");
  }
  return definition;
}

function getProjectionCodeForDefinition(definition) {
  const normalized = asNonEmptyString(definition);
  if (!normalized) {
    throw new Error("Projection definition is required.");
  }
  return `MOSAIC:${hashStringFnv1a(normalized)}`;
}

export function getManifestProjectionConfig(manifest) {
  const definition = getManifestProjectionDefinition(manifest);
  return {
    definition,
    code: getProjectionCodeForDefinition(definition)
  };
}
