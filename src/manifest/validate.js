/**
 * Validates normalized manifests against the web-tilelayer JSON schema
 * and returns a canonical manifest object used by the map runtime.
 */

import Ajv from "ajv/dist/2020";
import manifestSchema from "../../contracts/tiler-manifest.schema.json";
import { normalizeManifest } from "./normalize";

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(manifestSchema);

export function validateManifest(manifest) {
  const normalized = normalizeManifest(manifest);
  const valid = validate(normalized);
  if (!valid) {
    const message = ajv.errorsText(validate.errors, { separator: "; " });
    const error = new Error(`Invalid tile manifest: ${message}`);
    error.details = validate.errors;
    throw error;
  }
  return normalized;
}
