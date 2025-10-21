# Microsoft 365 SSO Integration Plan
**Clear Connections Contracting Ltd. - ProfitTracker Enhancement**

## 🎯 Project Overview

**Objective**: Replace Firebase email/password authentication with Microsoft 365 Single Sign-On integration for seamless employee access using existing company credentials.

**Business Value**: 
- One-click access for field workers using M365 credentials
- Centralized user management in M365 Admin Center
- Enhanced security with MFA and conditional access policies
- Reduced IT support burden and password management

**Timeline**: 2-3 development days (18-27 hours)
**Risk Level**: MODERATE - Well-documented process with rollback capability

---

## 📋 Phase 1: Azure AD Application Registration
**Duration**: 2-4 hours | **Owner**: IT Administrator

### Step 1.1: Create Azure AD App Registration
```bash
# Access Azure Portal (portal.azure.com)
# Navigate to: Azure Active Directory > App registrations > New registration
```

**Application Configuration**:
- **Name**: `ProfitTracker - Clear Connections`
- **Supported Account Types**: `Accounts in this organizational directory only`
- **Redirect URI**: 
  - Platform: `Single-page application (SPA)`
  - URI: `https://conner160.github.io/ProfitTracker/` (update with your domain)

### Step 1.2: Configure Authentication Settings
```json
// Authentication blade settings
{
  "redirectUris": [
    "https://conner160.github.io/ProfitTracker/",
    "https://localhost:3000/" // for development
  ],
  "implicitGrantSettings": {
    "enableIdTokenIssuance": true,
    "enableAccessTokenIssuance": true
  },
  "supportedAccountTypes": "AzureADMyOrgOnly"
}
```

### Step 1.3: API Permissions
**Required Permissions**:
- `Microsoft Graph > User.Read` (Delegated) - Read user profile
- `Microsoft Graph > email` (Delegated) - Read email address  
- `Microsoft Graph > openid` (Delegated) - Sign in users
- `Microsoft Graph > profile` (Delegated) - Read basic profile

**Admin Consent**: Grant admin consent for Clear Connections organization

### Step 1.4: Collect Configuration Values
```javascript
// Save these values for Firebase configuration
const azureConfig = {
  clientId: "12345678-1234-1234-1234-123456789abc", // Application (client) ID
  tenantId: "87654321-4321-4321-4321-cba987654321", // Directory (tenant) ID
  authority: "https://login.microsoftonline.com/87654321-4321-4321-4321-cba987654321"
}
```

---

## 🔥 Phase 2: Firebase Configuration
**Duration**: 4-6 hours | **Owner**: Developer

### Step 2.1: Enable Microsoft Provider in Firebase
```bash
# Firebase Console: Authentication > Sign-in method > Microsoft
# Enable Microsoft provider with Azure AD configuration
```

**Firebase Microsoft Provider Configuration**:
```json
{
  "clientId": "12345678-1234-1234-1234-123456789abc",
  "clientSecret": "generated-in-azure-certificates-secrets",
  "tenantId": "87654321-4321-4321-4321-cba987654321"
}
```

### Step 2.2: Update Firebase Security Rules
```javascript
// filepath: firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Clear Connections employees only - validate Microsoft token
    function isValidClearConnectionsUser() {
      return request.auth != null 
        && request.auth.token.email.matches('.*@(clearconnectionsc|clearconn|clearconnectionsltd).ca$')
        && request.auth.token.email_verified == true;
    }
    
    // User data access with M365 authentication
    match /users/{userId} {
      allow read, write: if isValidClearConnectionsUser() 
        && request.auth.uid == userId;
    }
    
    // Settings and entries with M365 authentication
    match /users/{userId}/entries/{entryId} {
      allow read, write: if isValidClearConnectionsUser() 
        && request.auth.uid == userId;
    }
    
    match /users/{userId}/settings/rates {
      allow read, write: if isValidClearConnectionsUser() 
        && request.auth.uid == userId;
    }
  }
}
```

### Step 2.3: Update Environment Configuration
```javascript
// filepath: config/env.js
// Enhanced configuration for Microsoft SSO integration

// ...existing code...

// Microsoft Azure AD Configuration
window.ENV_CONFIG.MICROSOFT = {
  clientId: "12345678-1234-1234-1234-123456789abc", // Replace with actual client ID
  tenantId: "87654321-4321-4321-4321-cba987654321", // Replace with actual tenant ID
  redirectUri: window.location.origin + "/ProfitTracker/",
  scopes: ["User.Read", "email", "openid", "profile"]
};

// Clear Connections domain validation for Microsoft tokens
window.ENV_CONFIG.COMPANY_DOMAINS = [
  'clearconnectionsc.ca',
  'clearconn.ca', 
  'clearconnectionsltd.ca'
];

window.secureLog.info('[ENV] Microsoft SSO configuration loaded for Clear Connections');
```

---

## 🔧 Phase 3: Code Implementation
**Duration**: 6-8 hours | **Owner**: Developer

### Step 3.1: Update Authentication Manager
```javascript
// filepath: scripts/authManager.js
/**
 * Enhanced Authentication Manager with Microsoft 365 SSO Integration
 * Clear Connections Contracting Ltd. - Enterprise Authentication
 */

// ...existing imports and setup...

// Microsoft Authentication Provider Setup
let microsoftProvider = null;

/**
 * Initialize Microsoft Sign-In Provider with Clear Connections configuration
 * Configures Azure AD integration with company-specific settings
 */
function initializeMicrosoftProvider() {
    try {
        microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');
        microsoftProvider.setCustomParameters({
            tenant: window.ENV_CONFIG.MICROSOFT.tenantId, // Clear Connections tenant
            prompt: 'select_account' // Allow account switching for shared devices
        });
        
        // Request essential user information scopes
        microsoftProvider.addScope('User.Read');
        microsoftProvider.addScope('email');
        microsoftProvider.addScope('openid');
        microsoftProvider.addScope('profile');
        
        window.secureLog.info('[AUTH] Microsoft provider initialized for Clear Connections');
        return true;
    } catch (error) {
        window.secureLog.error('[AUTH] Failed to initialize Microsoft provider:', error);
        return false;
    }
}

/**
 * Validate Clear Connections email domain from Microsoft token
 * Ensures only company employees can access ProfitTracker
 */
function validateCompanyEmail(email) {
    if (!email) {
        window.secureLog.warn('[AUTH] No email provided for validation');
        return false;
    }
    
    const domain = email.split('@')[1]?.toLowerCase();
    const isValid = window.ENV_CONFIG.COMPANY_DOMAINS.includes(domain);
    
    window.secureLog.info(`[AUTH] Email validation for ${email}: ${isValid ? 'VALID' : 'INVALID'}`);
    return isValid;
}

/**
 * Microsoft 365 Sign-In with popup flow
 * Provides seamless SSO experience for Clear Connections employees
 */
async function signInWithMicrosoft() {
    try {
        window.secureLog.info('[AUTH] Starting Microsoft SSO sign-in...');
        
        if (!microsoftProvider) {
            throw new Error('Microsoft provider not initialized');
        }
        
        // Perform Microsoft SSO authentication
        const result = await firebase.auth().signInWithPopup(microsoftProvider);
        const user = result.user;
        const credential = result.credential;
        
        // Extract Microsoft token information
        const accessToken = credential.accessToken;
        const idToken = credential.idToken;
        
        window.secureLog.info(`[AUTH] Microsoft SSO successful for: ${user.email}`);
        
        // Validate Clear Connections email domain
        if (!validateCompanyEmail(user.email)) {
            // Sign out immediately if not company email
            await firebase.auth().signOut();
            throw new Error(`Access denied. Please use your Clear Connections company email.`);
        }
        
        // Check email verification status from Microsoft
        if (!user.emailVerified) {
            window.secureLog.warn('[AUTH] Microsoft account email not verified');
            // Microsoft accounts are typically pre-verified, but check anyway
        }
        
        // Store additional Microsoft profile information
        const additionalUserInfo = result.additionalUserInfo;
        if (additionalUserInfo?.profile) {
            window.secureLog.info('[AUTH] Microsoft profile information retrieved');
            // Could store department, job title, etc. for future features
        }
        
        // Initialize authenticated app state
        window.secureLog.info('[AUTH] ✅ Clear Connections employee authenticated successfully');
        initializeAuthenticatedApp();
        
        return { success: true, user, accessToken };
        
    } catch (error) {
        window.secureLog.error('[AUTH] Microsoft SSO sign-in failed:', error);
        
        // Handle specific Microsoft SSO errors
        let userMessage = 'Sign-in failed. Please try again.';
        
        if (error.code === 'auth/popup-closed-by-user') {
            userMessage = 'Sign-in cancelled. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
            userMessage = 'Popup blocked. Please allow popups and try again.';
        } else if (error.code === 'auth/network-request-failed') {
            userMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('Access denied')) {
            userMessage = error.message; // Use our custom company email message
        }
        
        if (window.uiManager && window.uiManager.showNotification) {
            window.uiManager.showNotification(userMessage, 'error');
        }
        
        return { success: false, error: userMessage };
    }
}

/**
 * Enhanced sign-out with Microsoft SSO cleanup
 * Ensures complete session cleanup for shared devices
 */
async function signOut() {
    try {
        window.secureLog.info('[AUTH] Starting enhanced sign-out...');
        
        // Clear Firebase authentication
        await firebase.auth().signOut();
        
        // Clear local storage and IndexedDB
        localStorage.clear();
        if (window.dbFunctions && window.dbFunctions.clearAllData) {
            await window.dbFunctions.clearAllData();
        }
        
        // Clear service worker cache
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
        
        window.secureLog.info('[AUTH] ✅ Complete sign-out successful');
        
        // Redirect to login page
        window.location.href = 'login.html';
        
    } catch (error) {
        window.secureLog.error('[AUTH] Sign-out error:', error);
        // Force redirect even if cleanup fails
        window.location.href = 'login.html';
    }
}

// Enhanced authentication state monitoring
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        window.secureLog.info(`[AUTH] User state: ${user.email} (Provider: ${user.providerData[0]?.providerId})`);
        
        // Validate company email on every state change
        if (!validateCompanyEmail(user.email)) {
            window.secureLog.error('[AUTH] Invalid company email detected, signing out');
            signOut();
            return;
        }
        
        // Check if user signed in with Microsoft provider
        const isMicrosoftUser = user.providerData.some(provider => 
            provider.providerId === 'microsoft.com'
        );
        
        if (isMicrosoftUser) {
            window.secureLog.info('[AUTH] Microsoft SSO user confirmed');
        }
        
        initializeAuthenticatedApp();
    } else {
        window.secureLog.info('[AUTH] User signed out');
        // Redirect to login if not already there
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Enhanced authentication manager initialization
function initializeAuthManager() {
    window.secureLog.info('[AUTH] 🔐 Initializing Microsoft SSO authentication...');
    
    // Wait for Firebase to be ready
    if (!window.firebaseModules || !window.firebaseModules.auth) {
        window.secureLog.error('[AUTH] Firebase not ready for Microsoft provider initialization');
        return false;
    }
    
    // Initialize Microsoft provider
    const providerReady = initializeMicrosoftProvider();
    if (!providerReady) {
        window.secureLog.error('[AUTH] Failed to initialize Microsoft provider');
        return false;
    }
    
    window.secureLog.info('[AUTH] ✅ Microsoft SSO authentication initialized');
    return true;
}

// Export enhanced authentication functions
window.authManager = {
    initializeAuthManager,
    signInWithMicrosoft,
    signOut,
    validateCompanyEmail,
    // Legacy functions for backward compatibility during transition
    getCurrentUser: () => firebase.auth().currentUser,
    isEmailVerified: () => firebase.auth().currentUser?.emailVerified || false
};

window.secureLog.info('[AUTH] Enhanced Authentication Manager with Microsoft SSO loaded');
```

### Step 3.2: Create New Login Interface
```html
<!-- filepath: login.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProfitTracker - Clear Connections Sign In</title>
    
    <!-- Enhanced Security Headers for Microsoft SSO -->
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'self'; 
        script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://login.microsoftonline.com; 
        connect-src 'self' https://www.gstatic.com https://firebaseapp.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://login.microsoftonline.com https://graph.microsoft.com; 
        img-src 'self' data: https:; 
        style-src 'self' 'unsafe-inline'; 
        font-src 'self' https:; 
        frame-src 'self' https://login.microsoftonline.com;
    ">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
    <meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
    
    <!-- Favicon and PWA support -->
    <link rel="icon" type="image/png" sizes="180x180" href="images/icon-180x180.png">
    <link rel="manifest" href="manifest.json">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="styles/base.css">
    <link rel="stylesheet" href="styles/forms.css">
    
    <style>
        /* Microsoft SSO Specific Styles */
        .microsoft-signin-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            padding: 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
        }
        
        .microsoft-signin-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 24px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            min-width: 280px;
            justify-content: center;
        }
        
        .microsoft-signin-btn:hover {
            background: #106ebe;
        }
        
        .microsoft-signin-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .microsoft-icon {
            width: 20px;
            height: 20px;
            background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjEiIGhlaWdodD0iMjEiIHZpZXdCb3g9IjAgMCAyMSAyMSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iI0YyNTAyMiIvPgo8cmVjdCB4PSIxMSIgeT0iMSIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iIzdGQkEwMCIvPgo8cmVjdCB4PSIxIiB5PSIxMSIgd2lkdGg9IjkiIGhlaWdodD0iOSIgZmlsbD0iIzAwQTRFRiIvPgo8cmVjdCB4PSIxMSIgeT0iMTEiIHdpZHRoPSI5IiBoZWlnaHQ9IjkiIGZpbGw9IiNGRkI5MDAiLz4KPC9zdmc+');
            background-size: contain;
        }
        
        .loading-spinner {
            display: none;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 20px;
        }
        
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #0078d4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .security-badge {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 10px auto;
            max-width: fit-content;
        }
        
        .company-info {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #0078d4;
        }
        
        .error-message {
            display: none;
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <!-- Header with Clear Connections Branding -->
        <div class="login-header">
            <h1>💸 ProfitTracker</h1>
            <div class="security-badge">
                🔒 Secured by Microsoft 365 Enterprise
            </div>
            <p class="subtitle">Professional Earnings Tracking for Clear Connections Field Workers</p>
        </div>
        
        <!-- Loading Spinner -->
        <div id="loading-spinner" class="loading-spinner">
            <div class="spinner"></div>
            <span>Initializing Microsoft SSO...</span>
        </div>
        
        <!-- Microsoft SSO Sign-In -->
        <div id="microsoft-signin" class="microsoft-signin-container" style="display: none;">
            <div class="company-info">
                <h3>🏢 Clear Connections Contracting Ltd.</h3>
                <p>Use your company Microsoft 365 account to access ProfitTracker</p>
                <p><strong>Authorized domains:</strong></p>
                <ul style="text-align: left; display: inline-block;">
                    <li>@clearconnectionsc.ca</li>
                    <li>@clearconn.ca</li>
                    <li>@clearconnectionsltd.ca</li>
                </ul>
            </div>
            
            <button id="microsoft-signin-btn" class="microsoft-signin-btn">
                <div class="microsoft-icon"></div>
                Sign in with Microsoft 365
            </button>
            
            <div id="error-message" class="error-message"></div>
            
            <div class="signin-help">
                <p><strong>🔐 Enterprise Security Features:</strong></p>
                <ul style="text-align: left; font-size: 14px;">
                    <li>✅ Single Sign-On with your M365 account</li>
                    <li>✅ Multi-Factor Authentication support</li>
                    <li>✅ Same credentials as Outlook, Teams, SharePoint</li>
                    <li>✅ Centralized access management</li>
                    <li>✅ Bank-level encryption for all data</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer with Company Information -->
        <div class="login-footer">
            <p>🛡️ <strong>Enterprise Security:</strong> Your data is protected by Microsoft 365 security infrastructure with bank-level encryption and enterprise access controls.</p>
            <p>🏢 <strong>Company System:</strong> Secure authentication for Clear Connections Contracting Ltd Management and authorized employees only.</p>
            <p>📧 <strong>Access Control:</strong> Company email verification required. Your Microsoft 365 identity provides seamless access to ProfitTracker.</p>
            <p class="copyright">© 2024 Clear Connections Contracting Ltd. | Professional Profit Tracking System</p>
        </div>
    </div>
    
    <!-- Firebase SDKs -->
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"></script>
    
    <!-- Environment Configuration -->
    <script src="config/env.js"></script>
    
    <!-- Enhanced Login Script -->
    <script>
        /**
         * Microsoft 365 SSO Login Handler
         * Clear Connections Contracting Ltd.
         */
        
        // UI Elements
        const loadingSpinner = document.getElementById('loading-spinner');
        const microsoftSigninContainer = document.getElementById('microsoft-signin');
        const microsoftSigninBtn = document.getElementById('microsoft-signin-btn');
        const errorMessage = document.getElementById('error-message');
        
        /**
         * Initialize Firebase and Microsoft SSO
         */
        async function initializeApp() {
            try {
                window.secureLog.info('[LOGIN] Initializing Microsoft SSO login...');
                
                // Wait for environment config
                if (!window.ENV_CONFIG) {
                    throw new Error('Environment configuration not loaded');
                }
                
                // Initialize Firebase
                window.firebaseModules = {
                    app: firebase.initializeApp(window.ENV_CONFIG.FIREBASE),
                    auth: firebase.auth,
                    firestore: firebase.firestore
                };
                
                window.secureLog.info('[LOGIN] 🔥 Firebase initialized for Microsoft SSO');
                
                // Check if user is already authenticated
                firebase.auth().onAuthStateChanged((user) => {
                    if (user && user.email && isValidCompanyEmail(user.email)) {
                        window.secureLog.info(`[LOGIN] User already authenticated: ${user.email}`);
                        redirectToApp();
                    } else if (user) {
                        // Invalid email, sign out
                        window.secureLog.warn('[LOGIN] Invalid company email, signing out');
                        firebase.auth().signOut();
                        showSigninForm();
                    } else {
                        showSigninForm();
                    }
                });
                
            } catch (error) {
                window.secureLog.error('[LOGIN] Initialization failed:', error);
                showError('Failed to initialize. Please refresh the page.');
            }
        }
        
        /**
         * Validate Clear Connections company email
         */
        function isValidCompanyEmail(email) {
            if (!email) return false;
            const domain = email.split('@')[1]?.toLowerCase();
            return ['clearconnectionsc.ca', 'clearconn.ca', 'clearconnectionsltd.ca'].includes(domain);
        }
        
        /**
         * Show sign-in form
         */
        function showSigninForm() {
            loadingSpinner.style.display = 'none';
            microsoftSigninContainer.style.display = 'block';
            microsoftSigninBtn.disabled = false;
        }
        
        /**
         * Show error message
         */
        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            microsoftSigninBtn.disabled = false;
        }
        
        /**
         * Hide error message
         */
        function hideError() {
            errorMessage.style.display = 'none';
        }
        
        /**
         * Microsoft 365 Sign-In Handler
         */
        async function handleMicrosoftSignIn() {
            try {
                hideError();
                microsoftSigninBtn.disabled = true;
                microsoftSigninBtn.innerHTML = '<div class="spinner"></div> Signing in...';
                
                window.secureLog.info('[LOGIN] Starting Microsoft SSO authentication...');
                
                // Create Microsoft provider
                const provider = new firebase.auth.OAuthProvider('microsoft.com');
                provider.setCustomParameters({
                    tenant: window.ENV_CONFIG.MICROSOFT.tenantId,
                    prompt: 'select_account'
                });
                
                // Add required scopes
                provider.addScope('User.Read');
                provider.addScope('email');
                provider.addScope('openid');
                provider.addScope('profile');
                
                // Perform sign-in with popup
                const result = await firebase.auth().signInWithPopup(provider);
                const user = result.user;
                
                window.secureLog.info(`[LOGIN] Microsoft SSO successful: ${user.email}`);
                
                // Validate company email
                if (!isValidCompanyEmail(user.email)) {
                    await firebase.auth().signOut();
                    throw new Error('Access denied. Please use your Clear Connections company email address.');
                }
                
                window.secureLog.info('[LOGIN] ✅ Clear Connections employee authenticated');
                redirectToApp();
                
            } catch (error) {
                window.secureLog.error('[LOGIN] Microsoft SSO failed:', error);
                
                let userMessage = 'Sign-in failed. Please try again.';
                
                if (error.code === 'auth/popup-closed-by-user') {
                    userMessage = 'Sign-in cancelled. Please try again.';
                } else if (error.code === 'auth/popup-blocked') {
                    userMessage = 'Popup blocked. Please allow popups for this site and try again.';
                } else if (error.message.includes('Access denied')) {
                    userMessage = error.message;
                }
                
                showError(userMessage);
                
                // Reset button
                microsoftSigninBtn.disabled = false;
                microsoftSigninBtn.innerHTML = '<div class="microsoft-icon"></div> Sign in with Microsoft 365';
            }
        }
        
        /**
         * Redirect to main application
         */
        function redirectToApp() {
            window.secureLog.info('[LOGIN] Redirecting to ProfitTracker application...');
            window.location.href = 'index.html';
        }
        
        // Event Listeners
        microsoftSigninBtn.addEventListener('click', handleMicrosoftSignIn);
        
        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', initializeApp);
        
        window.secureLog.info('[LOGIN] Microsoft SSO login page loaded');
    </script>
</body>
</html>
```

### Step 3.3: Update Service Worker for Microsoft Integration
```javascript
// filepath: sw.js
// ...existing service worker code...

// Enhanced allowed origins for Microsoft SSO
const ALLOWED_ORIGINS = [
    'https://conner160.github.io',
    'https://firebaseapp.com',
    'https://firestore.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://login.microsoftonline.com', // Microsoft SSO
    'https://graph.microsoft.com',       // Microsoft Graph API
    'https://www.gstatic.com',
    'https://cdn.jsdelivr.net'
];

// Update cache name for Microsoft SSO release
const CACHE_NAME = 'profittracker-v3.0.0-microsoft-sso';

// ...rest of existing service worker code...
```

---

## 🧪 Phase 4: Testing & Validation
**Duration**: 4-6 hours | **Owner**: Developer + IT Administrator

### Step 4.1: Development Testing Checklist
```bash
# Local testing environment setup
- [ ] Test with Clear Connections test account
- [ ] Verify domain validation works correctly
- [ ] Test popup blocking scenarios
- [ ] Validate token information retrieval
- [ ] Check offline functionality still works
- [ ] Test sign-out cleanup process
```

### Step 4.2: Integration Testing
```javascript
// Test scenarios for Clear Connections employees
const testScenarios = [
    {
        description: "Valid company email (@clearconnectionsc.ca)",
        email: "test.user@clearconnectionsc.ca",
        expectedResult: "SUCCESS"
    },
    {
        description: "Valid company alias (@clearconn.ca)", 
        email: "test.user@clearconn.ca",
        expectedResult: "SUCCESS"
    },
    {
        description: "Valid company alias (@clearconnectionsltd.ca)",
        email: "test.user@clearconnectionsltd.ca", 
        expectedResult: "SUCCESS"
    },
    {
        description: "External email (should fail)",
        email: "test.user@gmail.com",
        expectedResult: "ACCESS_DENIED"
    }
];
```

### Step 4.3: User Acceptance Testing
**Test with actual Clear Connections employees**:
- [ ] Field worker can sign in using M365 credentials
- [ ] MFA prompts work correctly if enabled
- [ ] Account switching works on shared devices
- [ ] Existing data is preserved for current users
- [ ] Sign-out is complete and secure

### Step 4.4: Security Validation
```bash
# Security testing checklist
- [ ] CSP headers allow Microsoft domains
- [ ] Firebase rules validate Microsoft tokens
- [ ] Domain validation prevents external access
- [ ] Service worker blocks sensitive files
- [ ] HTTPS enforcement works correctly
```

---

## 📋 Phase 5: Documentation & Deployment
**Duration**: 2-3 hours | **Owner**: Developer

### Step 5.1: Update Project Documentation
```markdown
// filepath: CHANGELOG.md
## [3.0.0] - Microsoft 365 SSO Integration
### MAJOR UPDATE - Authentication System Overhaul

#### Added
- **Microsoft 365 Single Sign-On**: Seamless authentication using company M365 credentials
- **Azure AD Integration**: Enterprise-grade authentication infrastructure
- **Enhanced Security**: MFA and conditional access policy support
- **Centralized User Management**: IT can manage access through M365 Admin Center

#### Changed  
- **Authentication Method**: Replaced email/password with Microsoft SSO
- **Login Experience**: One-click sign-in with company credentials
- **User Provisioning**: Automatic access for new employees added to M365

#### Security Enhancements
- **Domain Validation**: Enhanced company email verification through Microsoft tokens
- **Token Validation**: Azure AD token claims validation for company domains
- **Session Management**: Improved sign-out with Microsoft session cleanup

#### Business Benefits for Clear Connections
- **Reduced Support**: No more password reset requests or account lockouts
- **Enhanced Security**: Inherits M365 MFA and security policies
- **Simplified Onboarding**: New employees get automatic ProfitTracker access
- **Professional Integration**: Seamless experience with existing company tools

#### Technical Implementation
- **Azure AD App Registration**: ProfitTracker registered as company application
- **Firebase Integration**: Microsoft provider configuration with company tenant
- **Enhanced CSP**: Updated Content Security Policy for Microsoft endpoints
- **Backward Compatibility**: Graceful migration from email/password system
```

### Step 5.2: Update AI Instructions
```markdown
// filepath: .github/copilot-instructions.md
// Add Microsoft SSO section to existing instructions

### Microsoft 365 SSO Integration
- **Authentication Provider**: Microsoft OAuth 2.0 with Azure AD
- **Domain Validation**: Company email verification through Microsoft token claims
- **Session Management**: Microsoft popup flow with automatic domain validation
- **Security**: Inherits M365 MFA, conditional access, and security policies
- **User Management**: Centralized through M365 Admin Center
- **Error Handling**: Specific Microsoft SSO error codes and user-friendly messages
```

### Step 5.3: Production Deployment
```bash
# Pre-deployment checklist
- [ ] Azure AD app registration completed
- [ ] Firebase Microsoft provider configured
- [ ] Production environment variables updated
- [ ] Service worker version incremented
- [ ] CSP headers configured at server level
- [ ] Backup of current authentication system created

# Deployment steps
git checkout main
git merge microsoft-sso-integration
git tag v3.0.0
git push origin main --tags

# Post-deployment validation
- [ ] Microsoft SSO login works for test account
- [ ] Domain validation prevents external access
- [ ] Existing user data preserved
- [ ] Performance metrics normal
```

---

## 🎯 Rollback Plan

### Emergency Rollback Procedure
```javascript
// If issues arise, quick rollback to email/password authentication

// Step 1: Revert to previous service worker version
const CACHE_NAME = 'profittracker-v2.5.2-secure';

// Step 2: Restore original login.html from backup
git checkout v2.5.2 -- login.html

// Step 3: Disable Microsoft provider in Firebase Console
// Step 4: Update authManager.js to use email/password methods

// Step 5: Communicate with Clear Connections employees
// "Temporary authentication issue - reverting to email/password"
```

### Migration Support
- **Dual Authentication**: Run both systems temporarily during transition
- **User Communication**: Email Clear Connections employees about new SSO
- **Support Documentation**: Create internal guide for IT support team
- **Training Session**: Optional demonstration for interested employees

---

## 📊 Success Metrics

### Technical Metrics
- **Authentication Success Rate**: >99% for valid company emails
- **Sign-in Time**: <5 seconds from click to authenticated state
- **Error Rate**: <1% for Microsoft SSO attempts
- **Security Violations**: 0 unauthorized access attempts

### Business Metrics
- **Employee Satisfaction**: Improved sign-in experience feedback
- **IT Support Reduction**: Fewer password-related support tickets
- **Adoption Rate**: Percentage of employees using new SSO
- **Time Savings**: Reduced time spent on authentication issues

---

## 🏆 Expected Benefits Summary

### For Clear Connections Employees
- **One-Click Access**: Same credentials as Outlook, Teams, SharePoint
- **No Password Management**: Eliminates forgotten password issues
- **Enhanced Security**: Automatic MFA and security policy inheritance
- **Professional Experience**: Enterprise-grade authentication flow

### For Clear Connections IT
- **Centralized Management**: Single point of user access control
- **Reduced Support**: Fewer authentication-related tickets
- **Enhanced Security**: Company-wide security policies apply automatically
- **Audit Compliance**: Authentication events in M365 audit logs

### For ProfitTracker System
- **Enterprise Integration**: Professional integration with company infrastructure
- **Enhanced Security**: Azure AD security features and monitoring
- **Simplified Onboarding**: Automatic access for new employees
- **Professional Branding**: Consistent with other company applications

---

**This implementation transforms ProfitTracker from a standalone application into a seamlessly integrated part of Clear Connections' M365 ecosystem!** 🚀

**Ready to proceed with Phase 1 (Azure AD setup)?** The entire project can be completed in 2-3 development days with significant long-term benefits for Clear Connections operations.
