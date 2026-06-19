# Layer Groups

Optional map layers can be assigned to a named group so that they appear as a single toggle in the Options panel. Toggling the group on or off shows or hides all member layers simultaneously.

## Usage

To enable a group of satellite imagery layers as one toggle, add `groupId` and `groupLabel` to each member layer entry in `map-config.json`:

```json
{
  "id": "appalachian-satellite-imagery",
  "groupId": "satellite-imagery",
  "groupLabel": "Satellite Imagery",
  ...
}
```

All layers sharing the same `groupId` are collapsed into one checkbox labeled with `groupLabel`. The checkbox appears checked if any member layer is currently visible.
