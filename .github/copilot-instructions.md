# ProfitTracker AI Agent Instructions

## Project Overview
ProfitTracker is an **online-first PWA** for **Clear Connections Contracting Ltd.** field workers tracking piece-rate earnings, mileage, and per diem payments with Excel export capabilities. Features offline backup capabilities with domain-restricted Firebase authentication for company employees.

## Architecture Patterns

### Modular Manager System
Each feature domain has a dedicated manager in `/scripts/`:
- `authManager.js` - Firebase auth with email verification gates
- `syncManager.js` - Offline-first sync with conflict resolution  
- `entryManager.js` - Daily entry CRUD operations
- `settingsManager.js` - User preferences and rates
- `travelSheetGenerator.js` - Excel export with template support
- `uiManager.js` - DOM manipulation and notifications

**Critical**: Managers expose functions globally via `window.managerName` for cross-module communication.

### Online-First Data Flow
```
User Input → Firebase (immediate, when online) → IndexedDB (backup only on failure)
```
- **Primary storage**: Firebase Firestore via `cloudStorage.js`
- **Backup storage**: IndexedDB via `db.js` (offline queue only)
- **Connection checking**: `navigator.onLine` validation before operations
- **Conflict resolution**: Last-write-wins with `cloudUpdatedAt` timestamps
- **Authentication gate**: Email verification required for cloud operations

### Security Architecture
**Environment Detection** (`config/env.js`):
- Auto-detects dev/prod based on hostname
- `window.secureLog` - conditional logging (dev only, errors always)
- `IS_DEVELOPMENT` flag controls console output

**Service Worker Security** (`sw.js`):
- Blocks access to sensitive files (`RESTRICTED_FILES` array)
- Origin validation against `ALLOWED_ORIGINS`
- Toggle `IS_DEVELOPMENT = false` for production deployment

**Firebase Auth** (`authManager.js`):
- Domain-restricted: `@clearconnectionsc.ca`, `@clearconn.ca`, `@clearconnectionsltd.ca`
- Email verification required before cloud sync enabled
- Automatic redirect flow: unauthenticated → `login.html` → verified → `index.html`

## Clear Connections Development Standards

### Code Quality Requirements
- **Commenting**: All functions, complex logic, and business rules must have comprehensive comments
- **Modularity**: Keep components modular - if it's used twice, centralize it
- **Security**: Always prioritize security - "Lock this shit down!" mentality
- **Company Context**: Built for Clear Connections Contracting Ltd. field operations

### Manager Initialization Order
1. `app.js` - Service worker registration + DOM ready
2. Environment config loaded (`config/env.js`)
3. Firebase modules initialized globally
4. Authentication checked → redirect or initialize managers
5. Database initialized → UI managers → data loaded

### Error Handling Convention
```javascript
// Always use secureLog for development visibility
window.secureLog.error('Error message', errorObject);
// Graceful degradation for missing dependencies
if (!window.cloudStorage) return;
```

### Documentation & Change Management
**Version Documentation Requirements**:
- **MAJOR updates** (new features, architecture changes): Update main `CHANGELOG.md`
- **MINOR updates** (enhancements, fixes): Append to existing `CHANGELOG.md` 
- **PATCH updates** (bug fixes, tweaks): Append to existing `CHANGELOG.md`
- **Format**: Follow semantic versioning (MAJOR.MINOR.PATCH) with Clear Connections context
- **Content**: Include business impact, technical changes, and security implications
- **Timing**: Document EVERY update - no exceptions for Clear Connections audit trail

**Service Worker Version Management**:
- **CRITICAL**: Update `CACHE_NAME` in `sw.js` for EVERY release (MAJOR.MINOR.PATCH)
- **Format**: `profittracker-vX.Y.Z-{current_project}` (e.g., `profittracker-v2.4.0-secure`)
- **PWA Cache**: Version increment forces cache refresh for all field workers
- **Deployment**: Ensures workers get latest updates without manual cache clearing

### Data Persistence Patterns
**Entry Structure**: Date-keyed objects with `{date, points, kilometers, perDiem, landLocations, cloudUpdatedAt}`
**Settings Structure**: Single rates object with `{pointRate, mileageRate, perDiemRate, gstNumber, techCode}`
**Sync Conflict Resolution**: Compare `cloudUpdatedAt` timestamps, newest wins

### Excel Generation Workflow
1. Filter entries by pay period + location presence
2. Load template from `CCC_Travel_Sheet.xlsx` or default
3. Map entries to Excel cells A29:C50 (dates, primary location, additional locations)
4. Auto-insert rows if >22 entries
5. Export as `[TechCode]_Travel_[StartDate]-[EndDate].xlsx`

## Development Commands
- **Debug mode**: Add `?dev=true` to URL for force development logging
- **Production deployment**: Set `IS_DEVELOPMENT = false` in `sw.js`
- **Security test**: Verify restricted files return 403 (e.g., `/config/env.js`)

## Integration Points
- **Firebase**: Primary data store - all modules depend on `window.firebaseModules` being initialized
- **IndexedDB**: Backup storage only - accessed via `window.dbFunctions` for offline queue
- **Connection Status**: Always check `navigator.onLine` before cloud operations
- **UI Updates**: Use `window.uiManager.showNotification()` and `updateSyncStatus()` for feedback
- **Pay Period Logic**: Bi-weekly periods starting July 5, 2025 via `dateUtils.js`
- **External Dependencies**: Monitor for changes - update this file when dependencies change

## Common Gotchas
- **Online-First**: Always check `navigator.onLine` before attempting cloud operations
- **Authentication**: State changes trigger full app re-initialization
- **Offline Queue**: Only used as backup - check timestamps to prevent duplicates
- **Excel Export**: Template must have rows 29+ available for data insertion
- **Security**: Service worker file restrictions apply at fetch level - update `RESTRICTED_FILES`
- **CSP**: Violations require updating both HTML meta tags AND service worker `ALLOWED_ORIGINS`
- **Dependencies**: Monitor external integrations - update documentation when they change