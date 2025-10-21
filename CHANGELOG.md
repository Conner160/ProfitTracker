# ProfitTracker Changelog

**Built for Clear Connections Contracting Ltd. Field Operations**

All notable changes to ProfitTracker will be documented in this file following semantic versioning (MAJOR.MINOR.PATCH).

## [2.0.0] - 2025-10-21 - MAJOR ARCHITECTURE OVERHAUL

### 🏗️ **BREAKING CHANGES: Offline-First → Online-First Architecture**
**Business Impact**: Field workers now get real-time data sync and clearer connection status feedback.

#### Architecture Changes
- **Data Flow Redesign**: Switched from offline-first to online-first with offline backup
- **Connection Validation**: Added `navigator.onLine` checks before all cloud operations  
- **User Experience**: Clear distinction between online mode (live data) vs offline mode (cached data)
- **Sync Behavior**: Primary storage now Firebase Firestore, IndexedDB only for backup/queue

#### Security & Authentication Enhancements
- **Login Page Marketing**: Added Google Firebase security branding and trust indicators
- **Security Messaging**: Enhanced user confidence with "bank-level encryption" and "enterprise-grade" language
- **Company Branding**: Clear Connections attribution and professional security features display
- **Email Verification**: Improved messaging around company email requirements

#### Code Quality Improvements  
- **AI Instructions**: Comprehensive development standards document created (`.github/copilot-instructions.md`)
- **Environment Logging**: Secure logging system with dev/prod detection (`window.secureLog`)
- **Error Handling**: Standardized error patterns with graceful degradation
- **Documentation**: Established changelog system for all future updates

#### Files Modified
- `scripts/entryManager.js` - Online-first save/load logic with proper connection checking
- `scripts/syncManager.js` - Enhanced authentication flow with email verification gates
- `login.html` - Security trust indicators and Google Firebase branding
- `.github/copilot-instructions.md` - Complete AI development guidance
- `sw.js` - Updated cache version to `v2.4.0-secure` for PWA refresh
- `CHANGELOG.md` - This file (new changelog system)

#### Technical Details
```
BEFORE: User Input → IndexedDB → Offline Queue → Firebase (when available)
AFTER:  User Input → Firebase (immediate, online) → IndexedDB (backup only)
```

#### Clear Connections Benefits
- **Real-time sync**: Workers see live earning data across devices
- **Professional appearance**: Login page builds employee confidence 
- **Security transparency**: Clear communication about data protection
- **Audit compliance**: Complete change documentation for company records

---

## Version Guidelines for Future Updates

### MAJOR (X.0.0) - Architecture/Breaking Changes
- Data structure changes affecting existing entries
- Authentication flow modifications
- New core features (Excel export, new manager modules)
- Security model updates

### MINOR (X.Y.0) - Feature Enhancements  
- New calculation methods or rate types
- UI improvements and new components
- Performance optimizations
- Additional export formats

### PATCH (X.Y.Z) - Bug Fixes & Tweaks
- Calculation corrections
- UI bug fixes
- Error handling improvements
- Text/messaging updates

---

**Maintained by Clear Connections Development Team**  
*For internal company use only - field worker earnings tracking system*

---

## [2.4.1] - 2025-10-21 - PATCH: CSP Security Fix

### 🔒 **Security Enhancement**
**Business Impact**: Eliminates console errors that could confuse field workers.

#### Bug Fixes
- **CSP Policy**: Added `https://cdn.jsdelivr.net` to `connect-src` directive
- **ExcelJS Source Maps**: Fixed "Refused to connect" error for development debugging
- **Cache Refresh**: Updated SW to `v2.4.1-secure` to force browser cache update

#### Files Modified
- `index.html` - Enhanced CSP policy for ExcelJS source map access
- `sw.js` - Version increment to `v2.4.1-secure`
- `CHANGELOG.md` - This patch documentation

#### Clear Connections Benefits
- **Clean Console**: No more CSP violation errors during development
- **Better Debugging**: Source maps accessible for troubleshooting
- **Professional Experience**: Eliminates confusing error messages for field workers

---

## [2.4.2] - 2025-10-21 - PATCH: Service Worker Security Fix

### 🔧 **Critical Bug Fix**
**Business Impact**: Resolves app initialization failure that prevented field workers from accessing ProfitTracker.

#### Issues Resolved
- **Firebase Initialization**: Fixed `Cannot read properties of undefined (reading 'FIREBASE')` error
- **Environment Access**: Service worker now allows `config/env.js` while blocking sensitive config files
- **App Loading**: Restored proper Firebase configuration loading for authentication

#### Security Enhancements
- **Granular Blocking**: Changed from blocking entire `/config/` directory to specific sensitive files
- **Maintained Security**: Still blocks `.env`, admin configs, and secret files
- **Selective Access**: Allows public environment config while protecting sensitive data

#### Files Modified
- `sw.js` - Updated `RESTRICTED_FILES` array with granular file blocking, version to `v2.4.2-secure`
- `CHANGELOG.md` - This patch documentation

#### Technical Details
```
BEFORE: Blocked entire /config/ directory → Firebase init failed
AFTER:  Block only /config/.env, /config/secrets.js, etc. → Firebase loads correctly
```

#### Clear Connections Benefits
- **App Functionality**: Workers can now access ProfitTracker without initialization errors
- **Maintained Security**: Sensitive configuration files still protected
- **Professional Operation**: App loads cleanly without console errors