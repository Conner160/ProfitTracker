# ProfitTracker Changelog

**Built for Clear Connections Contracting Ltd. Field Operations**

All notable changes to ProfitTracker will be documented in this file following semantic versioning (MAJOR.MINOR.PATCH).

## [3.0.0] - 2025-10-22 - MICROSOFT 365 SSO INTEGRATION

### 🔐 **MAJOR UPDATE: Authentication System Overhaul**
**Business Impact**: One-click access for all Clear Connections employees using existing Microsoft 365 credentials.

#### Added
- **Microsoft 365 Single Sign-On**: Seamless authentication using company M365 credentials
- **Azure AD Integration**: Enterprise-grade authentication infrastructure with company tenant isolation
- **Enhanced Security Features**: Inherits M365 MFA, conditional access policies, and security monitoring
- **Centralized User Management**: IT can manage ProfitTracker access directly through M365 Admin Center
- **Professional Integration**: Consistent experience with Outlook, Teams, SharePoint, and other company tools

#### Changed
- **Authentication Method**: Replaced email/password system with Microsoft SSO popup flow
- **Login Experience**: Modern Microsoft 365 branded interface with Clear Connections company information
- **User Provisioning**: Automatic ProfitTracker access for employees added to M365 tenant
- **Session Management**: Enhanced sign-out process with complete Microsoft session cleanup
- **Domain Validation**: Company email verification now handled through Microsoft token claims

#### Security Enhancements
- **Enterprise Security**: All authentication now protected by Microsoft 365 enterprise security infrastructure
- **Token Validation**: Azure AD token claims validation ensures only Clear Connections employees access system
- **Enhanced CSP**: Updated Content Security Policy to allow Microsoft authentication endpoints
- **Service Worker Security**: Added Microsoft domains to allowed origins for secure communication
- **Complete Session Cleanup**: Sign-out process now clears all local data, cache, and service worker registrations

#### Technical Implementation
- **Azure AD App Registration**: ProfitTracker registered as official Clear Connections company application
- **Firebase Microsoft Provider**: Configured Microsoft OAuth provider with company tenant restrictions
- **Environment Configuration**: Added Microsoft client ID, tenant ID, and company domain validation
- **Authentication Manager**: Complete rewrite supporting Microsoft provider initialization and domain validation
- **Login Interface**: New Microsoft 365 branded login page with company-specific domain restrictions

#### Files Modified
- `config/env.js` - Added Microsoft Azure AD configuration and company domain validation
- `scripts/authManager.js` - Complete rewrite with Microsoft SSO provider and enhanced security
- `login.html` - New Microsoft 365 branded interface with enterprise security messaging
- `sw.js` - Updated to v3.0.0-microsoft-sso with Microsoft domain allowlist
- `.github/copilot-instructions.md` - Added Microsoft SSO integration documentation

#### Business Benefits for Clear Connections
- **Reduced IT Support**: Eliminates password reset requests and account lockout issues
- **Enhanced Security**: Automatic inheritance of company-wide security policies and MFA requirements
- **Simplified Onboarding**: New employees automatically get ProfitTracker access when added to M365
- **Professional Experience**: Seamless integration with existing company authentication infrastructure
- **Centralized Management**: Single control point for user access management through familiar M365 tools
- **Audit Compliance**: All authentication events logged in M365 audit trail for compliance reporting

#### Migration Notes
- **Backward Compatibility**: Existing user data preserved during authentication system transition
- **Zero Downtime**: Seamless cutover from email/password to Microsoft SSO
- **User Communication**: Employees informed about new one-click sign-in experience
- **Rollback Capability**: Emergency rollback procedures documented for business continuity

#### Clear Connections Technical Specifications
```
Authentication Flow: Employee → Microsoft 365 → Azure AD → ProfitTracker
Domain Validation: @clearconnectionsc.ca, @clearconn.ca, @clearconnectionsltd.ca
Security Level: Enterprise M365 (MFA, Conditional Access, Security Monitoring)
Management: M365 Admin Center → User Access → ProfitTracker Application
```

---

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

---

## [2.5.0] - 2025-10-21 - MINOR: Email Alias & Username Support

### 🏢 **Clear Connections Employee Experience Enhancement**
**Business Impact**: Dramatically improves signin experience for field workers with flexible email/username options.

#### New Features
- **Username-Only Signin**: Workers can sign in with just 'joeblow' instead of full email
- **Email Alias Support**: All Clear Connections domains work (@clearconnectionsc.ca, @clearconn.ca, @clearconnectionsltd.ca)
- **Cross-Alias Authentication**: Sign up with one domain, sign in with any alias
- **Canonical Account Creation**: All accounts created with primary domain for consistency

#### Authentication Workflow
- **Signup**: Always creates account with @clearconnectionsc.ca (canonical)
- **Signin Options**: 
  - Username only: `joeblow` (tries all domain aliases)
  - Any company email: `joeblow@clearconn.ca`, `joeblow@clearconnectionsltd.ca`
  - Original email: `joeblow@clearconnectionsc.ca`

#### Technical Implementation
- **Email Normalization**: `normalizeEmailInput()` handles username-only and validation
- **Alias Resolution**: `getEmailAliases()` generates all possible email variations
- **Sequential Signin**: Tries each alias until authentication succeeds
- **Domain Validation**: Ensures only Clear Connections domains accepted

#### Files Modified
- `scripts/login.js` - Complete email alias system with username support
- `login.html` - Updated placeholders and helper text for new functionality
- `sw.js` - Version increment to `v2.5.0-secure`
- `CHANGELOG.md` - This feature documentation

#### User Experience Examples
```
Signup: joeblow@clearconn.ca → Account: joeblow@clearconnectionsc.ca
Signin Options:
  - 'joeblow' ✅
  - 'joeblow@clearconn.ca' ✅  
  - 'joeblow@clearconnectionsltd.ca' ✅
  - 'joeblow@clearconnectionsc.ca' ✅
```

#### Clear Connections Benefits
- **Simplified Access**: Workers remember just their username
- **Flexible Email**: Any company domain alias works for signin
- **Reduced Support**: No confusion about which email to use
- **Professional Workflow**: Matches how employees actually use email aliases

---

## [2.5.1] - 2025-10-21 - PATCH: Email Branding Update

### 📧 **Professional Email Communication**
**Business Impact**: Verification emails now properly represent Clear Connections Contracting Ltd Management instead of generic Firebase branding.

#### Branding Enhancements
- **Professional Sender**: Emails now appear from Clear Connections Contracting Ltd Management
- **Company Consistency**: Email branding matches company identity and standards
- **Employee Recognition**: Workers receive emails from recognizable company source
- **Trust Building**: Professional communication reinforces app legitimacy

#### Technical Implementation
- **Action Code Settings**: Added `EMAIL_ACTION_CODE_SETTINGS` with company branding configuration
- **Verification Emails**: Both signup and resend verification use Clear Connections branding
- **Redirect Handling**: Proper post-verification redirect to ProfitTracker dashboard
- **Console Messaging**: Updated logging to reflect professional email source

#### Files Modified
- `scripts/login.js` - Added email branding configuration and updated verification calls
- `sw.js` - Version increment to `v2.5.1-secure`
- `CHANGELOG.md` - This patch documentation

#### User Experience
- **Before**: Generic "noreply@profittrackerccc.firebaseapp.com" sender
- **After**: Professional "Clear Connections Contracting Ltd Management" branding
- **Recognition**: Employees immediately recognize company communication
- **Professionalism**: Email appears as official company correspondence

#### Clear Connections Benefits
- **Brand Consistency**: All communications reflect company identity
- **Employee Trust**: Professional emails build confidence in the system
- **Reduced Confusion**: Clear company sender prevents spam concerns
- **Corporate Standards**: Maintains professional communication protocols

---

## [2.5.2] - 2025-10-21 - PATCH: Login Visual Enhancement

### 💸 **Improved Brand Recognition**
**Business Impact**: Login screen now uses money emoji (💸) that better represents profit tracking for Clear Connections employees.

#### Visual Improvements
- **Title Emoji**: Changed from 🎯 (target) to 💸 (money with wings)
- **Thematic Consistency**: Emoji now directly represents profit/earnings tracking
- **Visual Recognition**: Clearer connection to financial/profit management
- **Employee Understanding**: Immediate visual cue about app purpose

#### Files Modified
- `login.html` - Updated ProfitTracker title emoji from 🎯 to 💸
- `sw.js` - Version increment to `v2.5.2-secure`
- `CHANGELOG.md` - This patch documentation

#### User Experience
- **Before**: 🎯 ProfitTracker (target/goal metaphor)
- **After**: 💸 ProfitTracker (direct profit/money representation)
- **Clarity**: Immediate visual understanding of app's financial purpose
- **Branding**: Better alignment with profit tracking functionality

#### Clear Connections Benefits
- **Visual Clarity**: Employees immediately understand app's profit focus
- **Professional Appearance**: Money emoji reinforces financial management purpose
- **Brand Alignment**: Visual consistency with profit tracking mission
- **User Recognition**: Clear connection between emoji and app functionality