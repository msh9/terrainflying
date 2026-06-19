import { normalizeRotationDegrees, radiansToDegrees } from "./rotation";

export function formatLonLat(cursorState) {
  const lonLat = cursorState?.lonLat ?? null;
  if (!lonLat || lonLat.length < 2) {
    return "Lat -- | Lon --";
  }
  const [lon, lat] = lonLat;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return "Lat -- | Lon --";
  }
  return `Lat ${lat.toFixed(5)} | Lon ${lon.toFixed(5)}`;
}

export function formatCursorDebug(cursorState) {
  const coordinate = cursorState?.coordinate ?? null;
  const zoom = cursorState?.zoom;
  const resolution = cursorState?.resolution;
  const lonLatText = formatLonLat(cursorState);
  const zoomText = Number.isFinite(zoom) ? `Zoom ${zoom.toFixed(2)}` : "Zoom --";
  const resText = Number.isFinite(resolution) ? `Res ${resolution.toFixed(2)}` : "Res --";
  const coordText =
    coordinate && coordinate.length >= 2
      ? `X ${coordinate[0].toFixed(2)} | Y ${coordinate[1].toFixed(2)}`
      : "X -- | Y --";

  return `${lonLatText} | ${zoomText} | ${resText} | ${coordText}`;
}

export function formatRotation(rotationRadians) {
  if (!Number.isFinite(rotationRadians)) {
    return "0.0 deg";
  }
  const degrees = radiansToDegrees(rotationRadians);
  const normalized = normalizeRotationDegrees(degrees);
  return `${normalized.toFixed(1)} deg`;
}
