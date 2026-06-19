# Issue #36 — FAA Navaids Overlay

An optional FAA Navaids layer is now available in the map Options panel under **FAA Navaids (NASR)**. When enabled, navaids are rendered as color-coded dots by type: blue for VOR/VOR-DME/VORTAC, amber for NDB/NDB-DME, green for TACAN/DME, and grey for other types (VOT, fan markers, marine NDB).

Clicking a navaid opens a popup showing its type, identifier, name, and frequency (formatted with the correct unit — MHz for VORs, kHz for NDBs, channel for TACANs). The effective date of the NASR cycle is shown next to the layer label in the panel. When both the Obstacles and Navaids layers are enabled, clicking a pixel where both features overlap shows the navaid popup with priority.
