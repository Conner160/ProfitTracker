# Changes in branch: fix_land_locations

Date: 2025-11-11

Summary

- Fixed an issue where UI control characters (drag-handle and delete button) were included in land location text when saving entries. This broke mapping and travel sheet generation.

What was changed

- Updated `scripts/locationManager.js`:
  - `getLandLocations()` now extracts the location text from the internal `.location-content` span (added by `makeDraggable`) to avoid including UI control characters in the returned location names.

Commits

- d32918c - Fix: read land location text from .location-content to avoid UI control characters breaking mapping
- cf91346 - Add CodingPartner chatmode and commands

Notes

- This fix keeps the existing UI (drag handles and delete buttons) but prevents their characters from being saved as part of the location name.
- Mapping and travel sheet generation should now receive clean location strings.

If you need me to push this branch or create a PR, say "push" or "open pr".
