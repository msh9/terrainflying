# web-tilelayer contracts

This folder contains web-tilelayer-specific configuration contracts.

- `tiler-manifest.schema.json` defines the tile manifest schema consumed by the
  web-tilelayer application. Treat it as a configuration file for the viewer.
- The schema represents the normalized viewer contract (`schemaVersion: "3.0"`).
  At load time, the app can normalize `raster-tilemaker` `tile_config.json`
  (`schemaVersion: "1.0"`) into this format.
