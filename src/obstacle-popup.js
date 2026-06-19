import Overlay from "ol/Overlay";

function parseJsonObject(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function asText(value, fallback = "Unknown") {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function formatFeetMeters(value) {
  const feet = value?.feet;
  const meters = value?.meters;
  const feetText = feet === null || feet === undefined ? null : `${asText(feet)} ft`;
  const metersText = meters === null || meters === undefined ? null : `${asText(meters)} m`;
  if (feetText && metersText) {
    return `${feetText} / ${metersText}`;
  }
  if (feetText) {
    return feetText;
  }
  if (metersText) {
    return metersText;
  }
  return "Unknown";
}

function formatVerticalAccuracy(value) {
  const parsed = parseJsonObject(value);
  if (!parsed) {
    return asText(value);
  }
  const description = asText(parsed.description);
  const units = formatFeetMeters(parsed);
  if (units === "Unknown") {
    return description;
  }
  return `${description} (${units})`;
}

export function toObstaclePopupRows(properties = {}) {
  const heights = parseJsonObject(properties.heights);
  const lighting = parseJsonObject(properties.lighting);

  return [
    {
      label: "Type",
      value: asText(properties.obstacle_type)
    },
    {
      label: "AGL",
      value: formatFeetMeters(heights?.agl)
    },
    {
      label: "AMSL",
      value: formatFeetMeters(heights?.amsl)
    },
    {
      label: "Lighting",
      value: asText(lighting?.description)
    },
    {
      label: "Vertical Accuracy",
      value: formatVerticalAccuracy(properties.vertical_accuracy)
    }
  ];
}

function renderObstaclePopupContent(element, properties = {}) {
  element.replaceChildren();
  const rows = toObstaclePopupRows(properties);
  rows.forEach(({ label, value }) => {
    const row = document.createElement("div");
    row.className = "obstacle-popup__row";
    const labelElement = document.createElement("span");
    labelElement.className = "obstacle-popup__label";
    labelElement.textContent = label;
    const valueElement = document.createElement("span");
    valueElement.className = "obstacle-popup__value";
    valueElement.textContent = value;
    row.append(labelElement, valueElement);
    element.append(row);
  });
}

export function attachObstaclePopup(map) {
  const popup = document.createElement("div");
  popup.className = "obstacle-popup";
  popup.dataset.role = "obstacle-popup";
  popup.hidden = true;

  const overlay = new Overlay({
    element: popup,
    offset: [12, -12],
    positioning: "bottom-left",
    stopEvent: false
  });
  map.addOverlay(overlay);

  const hide = () => {
    popup.hidden = true;
    overlay.setPosition(undefined);
  };

  const show = (feature, coordinate) => {
    const properties = typeof feature?.getProperties === "function" ? feature.getProperties() : {};
    renderObstaclePopupContent(popup, properties);
    popup.hidden = false;
    overlay.setPosition(coordinate);
  };

  return {
    show,
    hide,
    dispose: () => {
      hide();
      map.removeOverlay(overlay);
    }
  };
}
