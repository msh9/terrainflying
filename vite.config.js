import { defineConfig } from "vite";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseByteRange } from "./scripts/http-range";

const PROJECT_ROOT = fileURLToPath(new URL(".", import.meta.url));
const DEV_FIXTURE_DIR = path.resolve(PROJECT_ROOT, "tests/public/fixtures");
const DEV_TILE_DIR = process.env.FLYER_LOCAL_DIR
  ? path.resolve(PROJECT_ROOT, process.env.FLYER_LOCAL_DIR, "tiles")
  : path.resolve(PROJECT_ROOT, "local", "tiles");
const DEV_LOCAL_DIR = process.env.FLYER_LOCAL_DIR
  ? path.resolve(PROJECT_ROOT, process.env.FLYER_LOCAL_DIR)
  : path.resolve(PROJECT_ROOT, "local");

const MIME_TYPE_BY_EXTENSION = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".json", "application/json; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mvt", "application/vnd.mapbox-vector-tile"],
  [".pmtiles", "application/vnd.pmtiles"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"]
]);

function getMimeType(filePath) {
  return (
    MIME_TYPE_BY_EXTENSION.get(path.extname(filePath).toLowerCase()) || "application/octet-stream"
  );
}

function resolveMountedFile(prefix, mountDir, requestPath) {
  if (requestPath !== prefix && !requestPath.startsWith(`${prefix}/`)) {
    return null;
  }

  const relativePath = requestPath.slice(prefix.length).replace(/^\/+/, "");
  const resolvedMountDir = path.resolve(mountDir);
  const resolvedPath = path.resolve(resolvedMountDir, relativePath);
  if (
    resolvedPath !== resolvedMountDir &&
    !resolvedPath.startsWith(`${resolvedMountDir}${path.sep}`)
  ) {
    return null;
  }
  return resolvedPath;
}

function createDevStaticMountPlugin() {
  const mounts = [
    { prefix: "/fixtures", dir: DEV_FIXTURE_DIR },
    { prefix: "/tiles", dir: DEV_TILE_DIR },
    { prefix: "/local", dir: DEV_LOCAL_DIR }
  ];

  const applyMounts = (middlewares) => {
    middlewares.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return next();
      }

      const requestPath = new URL(req.url || "/", "http://localhost").pathname;
      for (const mount of mounts) {
        const filePath = resolveMountedFile(mount.prefix, mount.dir, requestPath);
        if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
          continue;
        }

        const fileStats = statSync(filePath);
        const byteRange = parseByteRange(
          typeof req.headers.range === "string" ? req.headers.range : undefined,
          fileStats.size
        );
        if (req.headers.range && !byteRange) {
          res.statusCode = 416;
          res.setHeader("Content-Range", `bytes */${fileStats.size}`);
          res.setHeader("Accept-Ranges", "bytes");
          res.end();
          return;
        }

        const hasRangeRequest = Boolean(byteRange);
        const streamStart = hasRangeRequest ? byteRange.start : 0;
        const streamEnd = hasRangeRequest ? byteRange.end : fileStats.size - 1;
        const contentLength = streamEnd - streamStart + 1;

        res.statusCode = hasRangeRequest ? 206 : 200;
        res.setHeader("Content-Type", getMimeType(filePath));
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Length", String(contentLength));
        if (hasRangeRequest) {
          res.setHeader("Content-Range", `bytes ${streamStart}-${streamEnd}/${fileStats.size}`);
        }
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        const stream = createReadStream(filePath, {
          start: streamStart,
          end: streamEnd
        });
        stream.on("error", () => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("Failed to read local static file.");
          }
        });
        stream.pipe(res);
        return;
      }

      return next();
    });
  };

  return {
    name: "dev-static-mounts",
    apply: "serve",
    configureServer(server) {
      applyMounts(server.middlewares);
    }
  };
}

export default defineConfig({
  plugins: [createDevStaticMountPlugin()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    exclude: ["tests/e2e/**", "node_modules/**"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["lit", "ol"]
        }
      }
    }
  }
});
