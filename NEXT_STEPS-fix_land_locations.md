# Next steps (fix_land_locations)

Date: 2025-11-11

Proposed follow-ups to consolidate this land location fix and improve reliability:

1. Local manual testing
   - Run the app locally and test adding, reordering (drag), deleting locations, and saving entries. Verify maps and travel sheet generation read correct locations.

2. Automated smoke test
   - Add a small browser-based test (Puppeteer / Playwright) to simulate UI interactions: add locations, reorder, delete, save entry, and assert stored data in IndexedDB.

3. Search for other textContent usage
   - Grep the repo for any remaining `element.textContent` usage that may unintentionally include UI control characters; update similar code paths to read `.location-content` where applicable.

4. Improve robustness
   - Update `setLandLocations()` to ensure `.location-content` exists for any DOM created by legacy or external code.

5. CI coverage
   - Add a CI job to run the smoke test on PRs for this repo to prevent regressions.

6. Optional UX tweaks
   - Consider moving drag handle and delete button into CSS pseudo-elements so they aren't part of DOM text at all. This would eliminate the risk of future text leaks.

7. Add changelog automation
   - Use the `md` command (ChatMode command) to auto-generate per-branch changelogs when landing fixes.

If you'd like, I can implement items 1-3 now. Reply with which number(s) to prioritize.