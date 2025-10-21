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

---

## [2.4.3] - 2025-10-21 - PATCH: Login Form Visibility Fix

### 🔧 **Critical UI Bug Fix**
**Business Impact**: Resolves login form invisibility that prevented Clear Connections employees from signing in.

#### Issues Resolved
- **Missing Function**: Added `showLoginForms()` function that was called but not defined
- **UI State Management**: Fixed loading spinner stuck visible, forms stuck hidden
- **Authentication Flow**: Proper form visibility when user is not authenticated
- **Verification Notice**: Enhanced `showVerificationNotice()` with proper UI state management

#### UI Enhancements
- **Progressive Loading**: Loading spinner → Login forms seamless transition
- **State Management**: Proper hiding/showing of UI elements based on auth state
- **Form Switching**: Ensured signin form is active by default
- **Error Handling**: Clean UI state on form switches and auth changes

#### Files Modified
- `scripts/login.js` - Added missing `showLoginForms()` and enhanced `showVerificationNotice()` functions
- `sw.js` - Version increment to `v2.4.3-secure`
- `CHANGELOG.md` - This patch documentation

#### Technical Details
```
BEFORE: Loading spinner visible, forms hidden (missing showLoginForms function)
AFTER:  Proper UI state management with smooth transitions
```

#### Clear Connections Benefits
- **Employee Access**: All workers can now sign in to ProfitTracker
- **Professional Experience**: Clean, responsive login interface
- **No Manual Workarounds**: Forms appear automatically without page refresh

---

## [2.4.4] - 2025-10-21 - PATCH: Login UI Styling Fix

### 🎨 **UI Layout Enhancement**
**Business Impact**: Improves login page appearance for Clear Connections employees with proper button alignment.

#### Issues Resolved
- **CSS Override**: Removed inline `style` attributes that were overriding CSS flex styling
- **Button Alignment**: Auth tabs now display with proper flex layout instead of cramped left alignment
- **Clean Styling**: Allows CSS files to control layout instead of JavaScript inline styles
- **Responsive Design**: Proper spacing and alignment across all device sizes

#### Technical Improvements
- **CSS Priority**: Used `removeAttribute('style')` instead of setting `display: block/flex`
- **Separation of Concerns**: JavaScript manages visibility, CSS manages styling
- **Flex Layout**: Auth tabs container now properly uses CSS flexbox rules
- **State Management**: Clean style attribute removal when showing elements

#### Files Modified
- `scripts/login.js` - Updated `showLoginForms()` and `switchTab()` to remove inline styles
- `sw.js` - Version increment to `v2.4.4-secure`
- `CHANGELOG.md` - This patch documentation

#### Technical Details
```
BEFORE: authTabs.style.display = 'flex' (overrides CSS)
AFTER:  authTabs.removeAttribute('style') (allows CSS flex to work)
```

#### Clear Connections Benefits
- **Professional Appearance**: Properly aligned login buttons and forms
- **Responsive Design**: Consistent layout across mobile and desktop
- **Brand Consistency**: UI matches design standards throughout the app