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

function formatNavaidFrequency(navaidType, freq) {
  if (!freq) {
    return "—";
  }
  const mhz = freq.mhz != null ? String(freq.mhz) : null;
  const channel = freq.channel != null ? String(freq.channel) : null;

  if (navaidType === "NDB" || navaidType === "NDB_DME") {
    return mhz ? `${mhz} kHz` : "—";
  }

  if (navaidType === "TACAN" || navaidType === "DME") {
    if (channel && mhz) return `${mhz} MHz / ${channel}`;
    if (channel) return channel;
    if (mhz) return `${mhz} MHz`;
    return "—";
  }

  if (navaidType === "VOR" || navaidType === "VOR_DME" || navaidType === "VORTAC") {
    let text = mhz ? `${mhz} MHz` : null;
    if (channel) text = text ? `${text} / ${channel}` : channel;
    return text || "—";
  }

  if (navaidType === "OTHER:VOT") {
    return mhz ? `${mhz} MHz` : "—";
  }

  if (mhz) return `${mhz} MHz`;
  if (channel) return channel;
  return "—";
}

export function toNavaidPopupRows(properties = {}) {
  const navaidType = asText(properties.navaid_type, "");
  const normalizedType = navaidType.replace(/_/g, "/") || "Unknown";

  const freq = parseJsonObject(properties.frequency);
  const freqText = formatNavaidFrequency(navaidType, freq);

  const status = asText(properties.navaid_status, "");

  const rows = [
    { label: "Type", value: normalizedType },
    { label: "Ident", value: asText(properties.designator) },
    { label: "Name", value: asText(properties.name) },
    { label: "Frequency", value: freqText }
  ];

  if (status && status !== "OPERATIONAL IFR") {
    rows.push({ label: "Status", value: status });
  }

  return rows;
}

function renderNavaidPopupContent(element, properties = {}) {
  element.replaceChildren();
  const rows = toNavaidPopupRows(properties);
  rows.forEach(({ label, value }) => {
    const row = document.createElement("div");
    row.className = "navaid-popup__row";
    const labelElement = document.createElement("span");
    labelElement.className = "navaid-popup__label";
    labelElement.textContent = label;
    const valueElement = document.createElement("span");
    valueElement.className = "navaid-popup__value";
    valueElement.textContent = value;
    row.append(labelElement, valueElement);
    element.append(row);
  });
}

export function createNavaidPopup(map) {
  const popup = document.createElement("div");
  popup.className = "navaid-popup";
  popup.dataset.role = "navaid-popup";
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
    renderNavaidPopupContent(popup, properties);
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
