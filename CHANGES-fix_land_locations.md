# Changes in branch: fix_land_locations

Date: 2025-11-11

Summary

- Prevented UI control characters (drag handle and delete affordance) from being saved into land location strings. Also made the drag/delete UX start-from-anywhere and single-tap-to-delete (with confirmation).

What was changed

- `scripts/locationManager.js`:
  - `addLandLocation()` now creates an explicit `.location-content` <span> when creating new `.landloc_p` elements so UI visuals can't pollute saved text.
  - `setLandLocations()` populates locations with `.location-content` spans instead of setting `element.textContent`.
  - `makeDraggable()` was made idempotent: it preserves an existing `.location-content` span when present rather than wiping `innerHTML`, and it attaches tap-to-delete and drag-from-anywhere handlers. Drag activation uses a small movement threshold to distinguish taps from drags.
  - `getLandLocations()` prefers the `.location-content` text and falls back to element text only if necessary.

- `styles/locations.css`:
  - Moved visual drag handle rendering to a CSS pseudo-element to avoid inserting characters into the DOM text.
  - Increased left padding for `.location-content` and added truncation/ellipsis to handle long names gracefully.

Commits

- d32918c - Fix: read land location text from .location-content to avoid UI control characters breaking mapping
- 76336c2 - Bump SW cache version; add changelog and next-steps for land locations fix
- cf91346 - Add CodingPartner chatmode and commands

Notes & verification

- Rationale: Previously the drag-handle and delete button were inserted as characters into the element's text content, which then got saved into entries. The refactor separates visual UI from saved data by using `.location-content` spans and CSS pseudo-elements.
- Manual QA recommended: open the app, add a location, reorder via drag (start dragging from the middle and edge), tap to delete (confirm), and then call `window.locationManager.getLandLocations()` in the console to ensure the returned array contains plain strings (no icons or extra characters).

Next steps

- Run a quick manual sanity test (add/reorder/delete + check `getLandLocations()` output).
- Optionally add a Playwright/Puppeteer smoke test to catch regressions.
- Prepare a PR to merge `fix_land_locations` into `main` and request review.

If you want me to run the manual sanity checks, add an automated test, or open a PR, tell me which and I'll proceed.


## 2025-11-11 (Auto-sync disabled)

- Disabled automatic background syncing due to frequent conflict reports from field users. The app will no longer automatically process offline queues or perform periodic/online-triggered syncs when a user signs in or when network state changes.
- What changed:
  - `scripts/syncManager.js`: removed automatic sync triggers on sign-in and online events. `onUserSignIn()` now only updates UI/state and notifies the user that auto-sync is disabled. `syncWhenOnline()` is now a no-op. Manual sync functions (e.g., `performManualSyncAll`) remain available for users or future UI wiring.

- Rationale: Prevent unwanted conflicts and unexpected data overwrites. Allows users to control when cloud sync happens.

- How to sync now:
  - Use the UI button (if present) to "Sync All" or call `window.syncManager.performManualSyncAll()` from the console to initiate a full manual sync.

## 2025-11-11 (Auto-migration deferred)

- Automatic migration of old local data to cloud has been deferred to manual action. Previously the app would detect old local entries during startup and auto-migrate them; this created unexpected background activity and migration notifications. Migration now requires explicit user action.

- What changed:
  - `scripts/migrationManager.js`: `checkForOldData()` no longer calls `migrateToCloudFirst()` automatically when old data is detected. Instead it sets a `migrationPending` flag and shows a non-blocking notification instructing the user to run migration manually. The `migrateToCloudFirst()` function remains available for manual use.

- How to migrate now:
  - From the console: `window.migrationManager.migrateToCloudFirst()`
  - A future UI button can call the same function when you want to offer in-app migration.


