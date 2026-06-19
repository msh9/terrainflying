const MAX_ROTATION_DEGREES = 180;
export const ROTATION_STEP_DEGREES = 3;
export const AUTO_ROTATE_PIXEL_DELTA = 64;

const FULL_CIRCLE_RADIANS = Math.PI * 2;

export function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

export function clampRotationRadians(rotationRadians) {
  if (!Number.isFinite(rotationRadians)) {
    return 0;
  }
  const max = degreesToRadians(MAX_ROTATION_DEGREES);
  if (rotationRadians > max) {
    return max;
  }
  if (rotationRadians < -max) {
    return -max;
  }
  return rotationRadians;
}

export function normalizeRotationDegrees(degrees) {
  if (!Number.isFinite(degrees)) {
    return 0;
  }
  const normalized = ((((degrees + 180) % 360) + 360) % 360) - 180;
  if (normalized === -180 && degrees > 0) {
    return 180;
  }
  return normalized;
}

export function normalizeAngleRadians(radians) {
  if (!Number.isFinite(radians)) {
    return 0;
  }
  const normalized =
    ((((radians + Math.PI) % FULL_CIRCLE_RADIANS) + FULL_CIRCLE_RADIANS) % FULL_CIRCLE_RADIANS) -
    Math.PI;
  if (normalized === -Math.PI && radians > 0) {
    return Math.PI;
  }
  return normalized;
}

export function bearingRadians(fromLonLat, toLonLat) {
  if (!fromLonLat || !toLonLat || fromLonLat.length < 2 || toLonLat.length < 2) {
    return 0;
  }
  const [fromLon, fromLat] = fromLonLat;
  const [toLon, toLat] = toLonLat;
  if (
    !Number.isFinite(fromLon) ||
    !Number.isFinite(fromLat) ||
    !Number.isFinite(toLon) ||
    !Number.isFinite(toLat)
  ) {
    return 0;
  }
  const phi1 = degreesToRadians(fromLat);
  const phi2 = degreesToRadians(toLat);
  const deltaLambda = degreesToRadians(toLon - fromLon);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const wrapped = (theta + FULL_CIRCLE_RADIANS) % FULL_CIRCLE_RADIANS;
  return wrapped;
}

export function autoRotationDeltaRadians(bearingNorth, bearingScreenUp) {
  return normalizeAngleRadians(bearingScreenUp - bearingNorth);
}
