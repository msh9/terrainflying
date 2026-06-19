import DragPan from "ol/interaction/DragPan";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import Overlay from "ol/Overlay";
import { transform } from "ol/proj";
import { getDistance as getSphereDistance } from "ol/sphere";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import CircleStyle from "ol/style/Circle";

const WGS84 = "EPSG:4326";
const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const WGS84_B = (1 - WGS84_F) * WGS84_A;
const MEASURE_COLOR = "#1b3a57";
const MEASURE_DOT_COLOR = "rgba(27, 58, 87, 0.8)";
const NAUTICAL_MILE_METERS = 1852;
const DEFAULT_HOLD_MS = 1250;
const HOLD_INDICATOR_DELAY_MS = 180;
const HOLD_UPDATE_INTERVAL_MS = 50;
const MIN_BARB_LENGTH = 1e-6;

// Returns an object whose cancel() clears a timer set via set(id).
function makeCanceller(clearFn) {
  let id = null;
  return {
    set: (newId) => {
      id = newId;
    },
    cancel: () => {
      if (id !== null) {
        clearFn(id);
        id = null;
      }
    }
  };
}

export function formatKilometers(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return "-- km";
  }
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

export function toNauticalMiles(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return NaN;
  }
  return distanceMeters / NAUTICAL_MILE_METERS;
}

export function formatKilometersAndNauticalMiles(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return "-- km (-- NM)";
  }
  return `${formatKilometers(distanceMeters)} (${toNauticalMiles(distanceMeters).toFixed(2)} NM)`;
}

export function formatHoldCountdown(remainingMs) {
  const seconds = Math.max(0, remainingMs) / 1000;
  return `Hold ${seconds.toFixed(1)}s to measure`;
}

export function distanceSpherical(startLonLat, endLonLat) {
  return getSphereDistance(startLonLat, endLonLat);
}

export function distanceGeodesic(startLonLat, endLonLat) {
  const [lon1, lat1] = startLonLat;
  const [lon2, lat2] = endLonLat;
  if (
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon2) ||
    !Number.isFinite(lat2)
  ) {
    return NaN;
  }

  if (lon1 === lon2 && lat1 === lat2) {
    return 0;
  }

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;
  const lambda2 = (lon2 * Math.PI) / 180;

  const U1 = Math.atan((1 - WGS84_F) * Math.tan(phi1));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(phi2));
  const L = lambda2 - lambda1;

  let lambda = L;
  let sinSigma;
  let cosSigma;
  let sigma;
  let sinAlpha;
  let cosSqAlpha;
  let cos2SigmaM;

  for (let i = 0; i < 100; i += 1) {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    const sinU1 = Math.sin(U1);
    const cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2);
    const cosU2 = Math.cos(U2);

    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2
    );

    if (sinSigma === 0) {
      return 0;
    }

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha ** 2;
    cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;

    const C = (WGS84_F / 16) * cosSqAlpha * (4 + WGS84_F * (4 - 3 * cosSqAlpha));

    const lambdaPrev = lambda;
    lambda =
      L +
      (1 - C) *
        WGS84_F *
        sinAlpha *
        (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));

    if (Math.abs(lambda - lambdaPrev) < 1e-12) {
      break;
    }

    if (i === 99) {
      return distanceSpherical(startLonLat, endLonLat);
    }
  }

  const uSq = (cosSqAlpha * (WGS84_A ** 2 - WGS84_B ** 2)) / WGS84_B ** 2;
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
          (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));

  return WGS84_B * A * (sigma - deltaSigma);
}

function createMeasurementLayer() {
  const source = new VectorSource();
  const lineFeature = new Feature(new LineString([]));
  const startDotFeature = new Feature();
  const endDotFeature = new Feature();
  const dotImage = new CircleStyle({
    radius: 2,
    fill: new Fill({ color: MEASURE_DOT_COLOR })
  });

  lineFeature.setStyle(
    new Style({
      stroke: new Stroke({
        color: MEASURE_COLOR,
        width: 2
      })
    })
  );

  startDotFeature.setStyle(
    new Style({
      image: dotImage
    })
  );

  endDotFeature.setStyle(
    new Style({
      image: dotImage
    })
  );

  source.addFeatures([lineFeature, startDotFeature, endDotFeature]);

  const layer = new VectorLayer({
    source,
    zIndex: 1000
  });

  return {
    layer,
    lineFeature,
    startDotFeature,
    endDotFeature
  };
}

function updateDots({ coordinates, startDotFeature, endDotFeature }) {
  if (coordinates.length === 0) {
    startDotFeature.setGeometry(null);
    endDotFeature.setGeometry(null);
    return;
  }
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  startDotFeature.setGeometry(new Point(start));
  const tooClose =
    coordinates.length < 2 || Math.hypot(end[0] - start[0], end[1] - start[1]) < MIN_BARB_LENGTH;
  endDotFeature.setGeometry(tooClose ? null : new Point(end));
}

function updateLine({ lineFeature, startDotFeature, endDotFeature, coordinates }) {
  if (coordinates.length >= 2) {
    const geometry = lineFeature.getGeometry();
    if (geometry) {
      geometry.setCoordinates(coordinates);
    } else {
      lineFeature.setGeometry(new LineString(coordinates));
    }
  } else {
    lineFeature.setGeometry(null);
  }
  updateDots({
    coordinates,
    startDotFeature,
    endDotFeature
  });
}

function clearLine({ lineFeature, startDotFeature, endDotFeature }) {
  updateLine({ lineFeature, startDotFeature, endDotFeature, coordinates: [] });
}

function sameCoordinate(first, second) {
  return (
    Array.isArray(first) &&
    Array.isArray(second) &&
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function sumMeasurementSegments(segments, key) {
  return segments.reduce((total, segment) => total + segment[key], 0);
}

export function formatMeasurementLines(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const total = {
    geodesic: sumMeasurementSegments(segments, "geodesic"),
    spherical: sumMeasurementSegments(segments, "spherical")
  };

  return [
    "Total",
    `Geodesic: ${formatKilometersAndNauticalMiles(total.geodesic)}`,
    `Spherical: ${formatKilometersAndNauticalMiles(total.spherical)}`,
    ...segments.flatMap((segment, index) => [
      `Segment ${index + 1}`,
      `Geodesic: ${formatKilometersAndNauticalMiles(segment.geodesic)}`,
      `Spherical: ${formatKilometersAndNauticalMiles(segment.spherical)}`
    ])
  ];
}

function toMeasurementSegments(coordinates, projection) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return [];
  }

  const segments = [];
  for (let index = 1; index < coordinates.length; index += 1) {
    const startLonLat = transform(coordinates[index - 1], projection, WGS84);
    const endLonLat = transform(coordinates[index], projection, WGS84);
    segments.push({
      geodesic: distanceGeodesic(startLonLat, endLonLat),
      spherical: distanceSpherical(startLonLat, endLonLat)
    });
  }
  return segments;
}

function preventTouchDefault(event) {
  const originalEvent = event?.originalEvent;
  if (originalEvent?.pointerType !== "touch" || !originalEvent.cancelable) {
    return;
  }
  originalEvent.preventDefault();
}

// Builds the hold-indicator DOM, overlay, and timer logic. Returns { show, hide, queue, overlay }.
// isEligible() is called after the show delay to check if the indicator should still appear.
function createHoldIndicator({ map, holdMs, holdIndicatorDelayMs, isEligible }) {
  const element = document.createElement("div");
  element.className = "measure-hold-indicator";
  element.dataset.role = "measure-hold-indicator";
  element.hidden = true;

  const label = document.createElement("div");
  label.className = "measure-hold-indicator__label";
  label.textContent = formatHoldCountdown(holdMs);

  const track = document.createElement("div");
  track.className = "measure-hold-indicator__track";
  const fill = document.createElement("div");
  fill.className = "measure-hold-indicator__fill";
  track.append(fill);
  element.append(label, track);

  const overlay = new Overlay({
    element,
    offset: [0, -14],
    positioning: "bottom-center",
    stopEvent: false
  });
  map.addOverlay(overlay);

  const delayTimer = makeCanceller(clearTimeout);
  const progressTimer = makeCanceller(clearInterval);
  let holdStartedAtMs = 0;

  const updateProgress = () => {
    const elapsedMs = performance.now() - holdStartedAtMs;
    const ratio = holdMs <= 0 ? 1 : Math.min(elapsedMs / holdMs, 1);
    label.textContent = formatHoldCountdown(holdMs <= 0 ? 0 : holdMs - elapsedMs);
    fill.style.width = `${(ratio * 100).toFixed(1)}%`;
    if (ratio >= 1) {
      progressTimer.cancel();
    }
  };

  const show = (coordinate, startedAtMs) => {
    holdStartedAtMs = startedAtMs;
    element.hidden = false;
    overlay.setPosition(coordinate);
    updateProgress();
    progressTimer.cancel();
    progressTimer.set(setInterval(updateProgress, HOLD_UPDATE_INTERVAL_MS));
  };

  const hide = () => {
    delayTimer.cancel();
    progressTimer.cancel();
    overlay.setPosition(undefined);
    element.hidden = true;
    fill.style.width = "0%";
  };

  const queue = (coordinate, startedAtMs) => {
    delayTimer.cancel();
    if (holdIndicatorDelayMs <= 0) {
      show(coordinate, startedAtMs);
      return;
    }
    delayTimer.set(
      setTimeout(() => {
        if (isEligible()) {
          show(coordinate, startedAtMs);
        }
      }, holdIndicatorDelayMs)
    );
  };

  return { show, hide, queue, overlay };
}

export function attachMeasurement(map, options = {}) {
  const {
    holdMs = DEFAULT_HOLD_MS,
    moveTolerancePx = 5,
    holdIndicatorDelayMs = HOLD_INDICATOR_DELAY_MS
  } = options;
  const projection = map.getView().getProjection();
  const { layer, lineFeature, startDotFeature, endDotFeature } = createMeasurementLayer();
  map.addLayer(layer);

  // --- DOM: measurement popup overlay
  const popup = document.createElement("div");
  popup.className = "measure-popup";
  popup.dataset.role = "measure-popup";
  popup.hidden = true;

  const overlay = new Overlay({
    element: popup,
    offset: [12, -12],
    positioning: "bottom-left",
    stopEvent: false
  });
  map.addOverlay(overlay);

  // --- Interaction state
  let pointerDown = false;
  let measureEligible = false;
  let activePointerId = null;
  let activePointerType = null;
  let startCoordinate = null;
  let startPixel = null;
  let touchPlacementActive = false;
  let committedCoordinates = [];
  let previewCoordinate = null;

  // --- DOM: hold indicator overlay
  const holdIndicator = createHoldIndicator({
    map,
    holdMs,
    holdIndicatorDelayMs,
    isEligible: () => pointerDown && measureEligible && !touchPlacementActive
  });

  const dragPan = map
    .getInteractions()
    .getArray()
    .find((interaction) => interaction instanceof DragPan);

  const hold = makeCanceller(clearTimeout);

  const setDragPan = (active) => {
    if (dragPan) {
      dragPan.setActive(active);
    }
  };

  // --- Rendering
  const renderMeasurement = () => {
    const coordinates = [...committedCoordinates];
    if (
      previewCoordinate &&
      !sameCoordinate(previewCoordinate, coordinates[coordinates.length - 1])
    ) {
      coordinates.push(previewCoordinate);
    }

    updateLine({
      lineFeature,
      startDotFeature,
      endDotFeature,
      coordinates
    });

    const lines = formatMeasurementLines(toMeasurementSegments(coordinates, projection));
    if (lines.length === 0) {
      overlay.setPosition(undefined);
      popup.hidden = true;
      return;
    }

    popup.replaceChildren(
      ...lines.map((line) => {
        const div = document.createElement("div");
        div.textContent = line;
        return div;
      })
    );
    popup.hidden = false;
    overlay.setPosition(coordinates[coordinates.length - 1]);
  };

  const clearMeasurement = () => {
    committedCoordinates = [];
    previewCoordinate = null;
    touchPlacementActive = false;
    setDragPan(true);
    clearLine({ lineFeature, startDotFeature, endDotFeature });
    overlay.setPosition(undefined);
    popup.hidden = true;
    holdIndicator.hide();
  };

  const addCommittedCoordinate = (coordinate) => {
    if (!coordinate) {
      return;
    }
    if (committedCoordinates.length === 0) {
      committedCoordinates = [coordinate];
      previewCoordinate = coordinate;
      renderMeasurement();
      return;
    }
    const lastCoordinate = committedCoordinates[committedCoordinates.length - 1];
    if (!sameCoordinate(lastCoordinate, coordinate)) {
      committedCoordinates = [...committedCoordinates, coordinate];
    }
    previewCoordinate = coordinate;
    renderMeasurement();
  };

  const startTouchPlacement = (coordinate) => {
    holdIndicator.hide();
    setDragPan(false);
    touchPlacementActive = true;
    if (committedCoordinates.length === 0) {
      committedCoordinates = [coordinate];
    }
    previewCoordinate = coordinate;
    renderMeasurement();
  };

  const finishTouchPlacement = (endCoordinate) => {
    if (!touchPlacementActive || committedCoordinates.length === 0) {
      return;
    }

    const nextCoordinate = endCoordinate ?? previewCoordinate ?? startCoordinate;
    const lastCoordinate = committedCoordinates[committedCoordinates.length - 1];
    if (nextCoordinate && !sameCoordinate(lastCoordinate, nextCoordinate)) {
      committedCoordinates = [...committedCoordinates, nextCoordinate];
    }

    previewCoordinate = nextCoordinate ?? null;
    touchPlacementActive = false;
    setDragPan(true);
    renderMeasurement();
  };

  // --- Event handlers
  const onContextMenu = (event) => {
    const pixel = map.getEventPixel(event);
    const coordinate = map.getCoordinateFromPixel(pixel);
    if (!coordinate) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    addCommittedCoordinate(coordinate);
  };

  const onPointerDown = (event) => {
    const pointerType = event.originalEvent?.pointerType ?? "mouse";
    const button = event.originalEvent?.button;

    if (pointerType !== "touch") {
      if (button === undefined || button === 0) {
        clearMeasurement();
      }
      return;
    }

    preventTouchDefault(event);
    pointerDown = true;
    measureEligible = true;
    activePointerId = event.pointerId;
    activePointerType = pointerType;
    startCoordinate = event.coordinate;
    startPixel = event.pixel;
    const startedAtMs = performance.now();
    holdIndicator.queue(startCoordinate, startedAtMs);

    hold.cancel();
    hold.set(
      setTimeout(() => {
        if (pointerDown && measureEligible) {
          startTouchPlacement(startCoordinate);
        }
      }, holdMs)
    );
  };

  const handleActiveTouchMove = (event) => {
    preventTouchDefault(event);
    if (!touchPlacementActive) {
      if (measureEligible && startPixel) {
        const dx = event.pixel[0] - startPixel[0];
        const dy = event.pixel[1] - startPixel[1];
        if (Math.hypot(dx, dy) > moveTolerancePx) {
          measureEligible = false;
          hold.cancel();
          holdIndicator.hide();
        }
      }
      return;
    }

    previewCoordinate = event.coordinate;
    renderMeasurement();
  };

  const onPointerMove = (event) => {
    if (pointerDown && event.pointerId === activePointerId && activePointerType === "touch") {
      handleActiveTouchMove(event);
      return;
    }

    if (activePointerType !== "touch" && committedCoordinates.length > 0) {
      previewCoordinate = event.coordinate;
      renderMeasurement();
    }
  };

  const onPointerUp = (event) => {
    if (activePointerType !== "touch" || !pointerDown || event.pointerId !== activePointerId) {
      return;
    }

    pointerDown = false;
    preventTouchDefault(event);
    hold.cancel();
    holdIndicator.hide();

    if (touchPlacementActive) {
      finishTouchPlacement(event.coordinate ?? startCoordinate);
    } else if (committedCoordinates.length > 0) {
      clearMeasurement();
    }

    measureEligible = false;
    activePointerId = null;
    activePointerType = null;
    startCoordinate = null;
    startPixel = null;
  };

  map.getViewport().addEventListener("contextmenu", onContextMenu);
  map.on("pointerdown", onPointerDown);
  map.on("pointermove", onPointerMove);
  map.on("pointerup", onPointerUp);
  map.on("pointercancel", onPointerUp);

  return {
    clear: clearMeasurement,
    dispose: () => {
      hold.cancel();
      holdIndicator.hide();
      map.getViewport().removeEventListener("contextmenu", onContextMenu);
      map.un("pointerdown", onPointerDown);
      map.un("pointermove", onPointerMove);
      map.un("pointerup", onPointerUp);
      map.un("pointercancel", onPointerUp);
      map.removeLayer(layer);
      map.removeOverlay(overlay);
      map.removeOverlay(holdIndicator.overlay);
      clearMeasurement();
    }
  };
}
