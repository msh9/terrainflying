import "./components/tile-viewer-app";

export function renderApp(target, options = {}) {
  const { manifestUrl, mapEnabled = true, autoLoad = true } = options;
  const app = document.createElement("tile-viewer-app");
  if (manifestUrl) {
    app.manifestUrl = manifestUrl;
  }
  app.mapEnabled = mapEnabled;
  app.autoLoad = autoLoad;
  target.append(app);
  return app;
}
