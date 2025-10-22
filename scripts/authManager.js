/**
 * Enhanced Authentication Manager with Microsoft 365 SSO Integration
 * Clear Connections Contracting Ltd. - Enterprise Authentication
 * 
 * Features:
 * - Microsoft 365 Single Sign-On with Azure AD integration
 * - Clear Connections domain validation (@clearconnectionsc.ca, @clearconn.ca, @clearconnectionsltd.ca)
 * - Enhanced session management with complete cleanup on sign-out
 * - Backward compatibility with existing Firebase authentication
 * - Enterprise-grade security with MFA and conditional access support
 */

// Current user state
let currentUser = null;
let authInitialized = false;

// Microsoft Authentication Provider Setup
let microsoftProvider = null;

/**
 * Initialize Microsoft Sign-In Provider with Clear Connections configuration
 * Configures Azure AD integration with company-specific settings
 * @function initializeMicrosoftProvider
 * @returns {boolean} True if provider initialized successfully
 */
function initializeMicrosoftProvider() {
    try {
        window.secureLog.info('[AUTH] Initializing Microsoft provider for Clear Connections...');

        if (!window.ENV_CONFIG || !window.ENV_CONFIG.MICROSOFT) {
            throw new Error('Microsoft configuration not found in ENV_CONFIG');
        }

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
 * @function validateCompanyEmail
 * @param {string} email - Email address to validate
 * @returns {boolean} True if domain is valid for Clear Connections
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
 * @async
 * @function signInWithMicrosoft
 * @returns {Promise<Object>} Result object with success status and user data
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
 * Initializes authentication system and sets up UI event listeners
 * Enhanced for Microsoft SSO integration
 * @async
 * @function initializeAuth
 * @returns {Promise<void>}
 */
async function initializeAuth() {
    try {
        window.secureLog.info('[AUTH] 🔐 Initializing Microsoft SSO authentication...');

        // Mark as initializing
        window.authManager.isInitializing = true;

        // Wait for Firebase to be available
        await waitForFirebase();

        // Initialize Microsoft provider
        const providerReady = initializeMicrosoftProvider();
        if (!providerReady) {
            window.secureLog.error('[AUTH] Failed to initialize Microsoft provider');
        }

        // Set up auth state listener with enhanced Microsoft SSO support
        window.firebaseModules.onAuthStateChanged(window.firebaseAuth, (user) => {
            handleAuthStateChange(user);
        });

        // Set up UI event listeners (legacy support during transition)
        setupAuthEventListeners();

        authInitialized = true;
        window.secureLog.info('[AUTH] ✅ Microsoft SSO authentication initialized');

        window.authManager.isInitializing = false;

    } catch (error) {
        window.secureLog.error('[AUTH] ❌ Error initializing authentication:', error);
        window.authManager.isInitializing = false;

        if (error.message && error.message.includes('configuration-not-found')) {
            window.secureLog.info('[AUTH] 🔧 Firebase Authentication not configured - using offline mode');
            showOfflineMode();
        } else {
            window.secureLog.info('[AUTH] 🔧 Authentication unavailable - using offline mode');
            showOfflineMode();
        }
    }
}

/**
 * Waits for Firebase to be loaded and available
 * @async
 * @function waitForFirebase
 * @returns {Promise<void>}
 */
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds

        const checkFirebase = () => {
            if (window.firebaseAuth && window.firebaseDb) {
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Firebase failed to load'));
            } else {
                attempts++;
                setTimeout(checkFirebase, 100);
            }
        };

        checkFirebase();
    });
}

/**
 * Enhanced authentication state change handler with Microsoft SSO support
 * @function handleAuthStateChange
 * @param {Object|null} user - Firebase user object or null
 * @returns {void}
 */
function handleAuthStateChange(user) {
    currentUser = user;

    // Call registered callbacks
    if (window.authManager._callbacks) {
        window.authManager._callbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                window.secureLog.error('[AUTH] Error in auth state change callback:', error);
            }
        });
    }

    if (user) {
        window.secureLog.info(`[AUTH] User state: ${user.email} (Provider: ${user.providerData[0]?.providerId})`);

        // Validate company email on every state change for enhanced security
        if (!validateCompanyEmail(user.email)) {
            window.secureLog.error('[AUTH] Invalid company email detected, signing out');
            signOutUser();
            return;
        }

        // Check if user signed in with Microsoft provider
        const isMicrosoftUser = user.providerData.some(provider =>
            provider.providerId === 'microsoft.com'
        );

        if (isMicrosoftUser) {
            window.secureLog.info('[AUTH] Microsoft SSO user confirmed');
        }

        // Check if user's email is verified
        if (!user.emailVerified && !isMicrosoftUser) {
            window.secureLog.info('[AUTH] 📧 Email not verified, redirecting to login...');
            // Redirect to login page for verification
            if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
                return;
            }
        } else {
            // User is verified - ensure they're on the main app
            if (window.location.pathname === '/login.html' || window.location.pathname.endsWith('login.html')) {
                window.secureLog.info('[AUTH] ✅ User verified, redirecting to main app...');
                window.location.href = 'index.html';
                return;
            }
        }

        showSignedInUI(user);

        // Trigger sync when user signs in (only on main app)
        if (window.syncManager && window.syncManager.onUserSignIn) {
            window.syncManager.onUserSignIn(user);
        }

    } else {
        window.secureLog.info('[AUTH] User signed out');

        // Redirect to login page if on main app
        if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('login.html')) {
            window.secureLog.info('[AUTH] 🔒 No user, redirecting to login...');
            window.location.href = 'login.html';
            return;
        }

        showSignedOutUI();

        // Handle sign out (only on main app)
        if (window.syncManager && window.syncManager.onUserSignOut) {
            window.syncManager.onUserSignOut();
        }
    }
}

/**
 * Sets up event listeners for authentication UI
 * @function setupAuthEventListeners
 * @returns {void}
 */
function setupAuthEventListeners() {
    // Email Sign-In Toggle
    document.getElementById('sign-in-toggle-btn')?.addEventListener('click', showEmailAuthForm);

    // Email Sign-In
    document.getElementById('sign-in-email-btn')?.addEventListener('click', signInWithEmail);

    // Email Sign-Up
    document.getElementById('sign-up-email-btn')?.addEventListener('click', signUpWithEmail);

    // Cancel Email Form
    document.getElementById('cancel-email-btn')?.addEventListener('click', hideEmailAuthForm);

    // Sign Out
    document.getElementById('sign-out-btn')?.addEventListener('click', signOutUser);

    // Enter key in password field
    document.getElementById('auth-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            signInWithEmail();
        }
    });
}

/**
 * Signs in user with email and password
 * @async
 * @function signInWithEmail
 * @returns {Promise<void>}
 */
async function signInWithEmail() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        window.uiManager.showNotification('Please enter email and password', true);
        return;
    }

    try {
        await window.firebaseModules.signInWithEmailAndPassword(window.firebaseAuth, email, password);
        window.uiManager.showNotification('Signed in successfully!');
        hideEmailAuthForm();
    } catch (error) {
        console.error('Email sign-in error:', error);
        let message = 'Sign-in failed. ';
        if (error.code === 'auth/configuration-not-found') {
            message = 'Authentication not configured. Using offline mode.';
            console.log('Firebase Auth not configured, switching to offline mode');
            showOfflineMode();
            return;
        } else if (error.code === 'auth/user-not-found') {
            message += 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            message += 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            message += 'Invalid email address.';
        } else {
            message += 'Please try again.';
        }
        window.uiManager.showNotification(message, true);
    }
}

/**
 * Signs up user with email and password
 * @async
 * @function signUpWithEmail
 * @returns {Promise<void>}
 */
async function signUpWithEmail() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        window.uiManager.showNotification('Please enter email and password', true);
        return;
    }

    // Validate email domain
    if (!isValidEmailDomain(email)) {
        window.uiManager.showNotification('Only @clearconnectionsc.ca, @clearconn.ca, or @clearconnectionsltd.ca email addresses are allowed', true);
        return;
    }

    if (password.length < 6) {
        window.uiManager.showNotification('Password must be at least 6 characters', true);
        return;
    }

    try {
        const userCredential = await window.firebaseModules.createUserWithEmailAndPassword(window.firebaseAuth, email, password);

        // Send email verification
        await window.firebaseModules.sendEmailVerification(userCredential.user);

        window.uiManager.showNotification('Account created! Please check your email and verify your address before syncing data.');
        hideEmailAuthForm();
    } catch (error) {
        console.error('Email sign-up error:', error);
        let message = 'Sign-up failed. ';
        if (error.code === 'auth/configuration-not-found') {
            message = 'Authentication not configured. Using offline mode.';
            console.log('Firebase Auth not configured, switching to offline mode');
            showOfflineMode();
            return;
        } else if (error.code === 'auth/email-already-in-use') {
            message += 'An account with this email already exists.';
        } else if (error.code === 'auth/invalid-email') {
            message += 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            message += 'Password is too weak.';
        } else {
            message += 'Please try again.';
        }
        window.uiManager.showNotification(message, true);
    }
}

/**
 * Clears service worker caches
 * @function clearServiceWorkerCache
 * @returns {Promise<void>}
 */
async function clearServiceWorkerCache() {
    try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('🧹 Clearing service worker cache...');

            return new Promise((resolve, reject) => {
                const messageChannel = new MessageChannel();

                messageChannel.port1.onmessage = (event) => {
                    if (event.data.type === 'CACHE_CLEARED') {
                        if (event.data.success) {
                            console.log('✅ Service worker cache cleared');
                            resolve();
                        } else {
                            console.error('❌ Failed to clear service worker cache:', event.data.error);
                            resolve(); // Don't fail logout if cache clearing fails
                        }
                    }
                };

                navigator.serviceWorker.controller.postMessage(
                    { type: 'CLEAR_CACHE' },
                    [messageChannel.port2]
                );

                // Timeout after 5 seconds
                setTimeout(() => {
                    console.log('⚠️ Service worker cache clearing timed out');
                    resolve();
                }, 5000);
            });
        } else {
            console.log('⚠️ Service worker not available, skipping cache clearing');
        }
    } catch (error) {
        console.error('❌ Error clearing service worker cache:', error);
        // Don't fail logout if cache clearing fails
    }
}

/**
 * Clears all local data from browser storage
 * @function clearAllLocalData
 * @returns {Promise<void>}
 */
async function clearAllLocalData() {
    try {
        console.log('🧹 Clearing all local data...');

        // Clear IndexedDB entries and settings using available database functions
        if (window.dbFunctions) {
            // Clear legacy entries store
            await window.dbFunctions.clearAllEntries().catch(e =>
                console.log('Legacy entries store already empty or not found:', e.message)
            );

            // Clear offline queues
            await window.dbFunctions.clearOfflineQueue('offline_entries').catch(e =>
                console.log('Offline entries queue already empty or not found:', e.message)
            );
            await window.dbFunctions.clearOfflineQueue('offline_settings').catch(e =>
                console.log('Offline settings queue already empty or not found:', e.message)
            );

            // Clear settings store completely - remove all settings keys
            await window.dbFunctions.deleteFromDB('settings', 'rates').catch(e =>
                console.log('Settings rates already empty or not found:', e.message)
            );

            // Clear any other potential settings keys
            const settingsKeys = ['rates', 'preferences', 'userSettings', 'appConfig'];
            for (const key of settingsKeys) {
                await window.dbFunctions.deleteFromDB('settings', key).catch(e =>
                    console.log(`Settings key '${key}' already empty or not found:`, e.message)
                );
            }

            console.log('✅ IndexedDB data cleared');
        } else {
            console.log('⚠️ Database functions not available, skipping IndexedDB cleanup');
        }

        // Clear service worker cache
        await clearServiceWorkerCache();

        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Browser storage cleared');

    } catch (error) {
        console.error('❌ Error clearing local data:', error);
        // Still proceed with logout even if cleanup fails
    }
}

/**
 * Shows logout progress overlay
 * @function showLogoutProgress
 */
function showLogoutProgress() {
    const overlay = document.getElementById('logout-progress-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // Disable the sign out button to prevent multiple clicks
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.disabled = true;
            signOutBtn.textContent = 'Signing Out...';
        }
    }
}

/**
 * Updates logout progress step
 * @function updateLogoutStep
 * @param {string} stepId - ID of the step element
 * @param {string} status - 'active', 'completed', or 'waiting'
 */
function updateLogoutStep(stepId, status) {
    const step = document.getElementById(stepId);
    if (step) {
        step.classList.remove('active', 'completed');
        if (status !== 'waiting') {
            step.classList.add(status);
        }

        // Update icon
        const icon = step.querySelector('.step-icon');
        if (icon) {
            if (status === 'completed') {
                icon.textContent = '✅';
            } else if (status === 'active') {
                icon.textContent = '🔄';
            } else {
                icon.textContent = '⏳';
            }
        }
    }
}

/**
 * Enhanced sign-out with Microsoft SSO cleanup
 * Ensures complete session cleanup for shared devices and enterprise security
 * @async
 * @function signOutUser
 * @returns {Promise<void>}
 */
async function signOutUser() {
    try {
        window.secureLog.info('[AUTH] Starting enhanced sign-out...');

        // Show logout progress
        showLogoutProgress();

        // Step 1: Clear local data
        updateLogoutStep('step-clearing-local', 'active');
        document.getElementById('logout-status-text').textContent = 'Clearing local data...';
        await clearAllLocalData();
        updateLogoutStep('step-clearing-local', 'completed');

        // Step 2: Clear cache (already done in clearAllLocalData, but show progress)
        updateLogoutStep('step-clearing-cache', 'active');
        document.getElementById('logout-status-text').textContent = 'Clearing browser cache...';
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
        updateLogoutStep('step-clearing-cache', 'completed');

        // Step 3: Firebase sign out (includes Microsoft SSO cleanup)
        updateLogoutStep('step-firebase-signout', 'active');
        document.getElementById('logout-status-text').textContent = 'Signing out from Microsoft 365...';
        await window.firebaseModules.signOut(window.firebaseAuth);
        currentUser = null;
        updateLogoutStep('step-firebase-signout', 'completed');
        window.secureLog.info('[AUTH] ✅ Complete sign-out successful');

        // Step 4: Clear service worker registrations for complete cleanup
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // Step 5: Redirect
        updateLogoutStep('step-redirecting', 'active');
        document.getElementById('logout-status-text').textContent = 'Redirecting to login page...';
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay to show completion
        updateLogoutStep('step-redirecting', 'completed');

        // Redirect to login page
        window.location.href = 'login.html';

    } catch (error) {
        window.secureLog.error('[AUTH] Sign-out error:', error);

        // Hide progress overlay and show error
        const overlay = document.getElementById('logout-progress-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Re-enable sign out button
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.disabled = false;
            signOutBtn.textContent = 'Sign Out';
        }

        // Show error notification
        if (window.uiManager) {
            window.uiManager.showNotification('Error signing out. Please try again.', true);
        }

        // Force redirect even if cleanup fails (security measure)
        window.location.href = 'login.html';
    }
}

/**
 * Shows the signed-in UI state
 * @function showSignedInUI
 * @param {Object} user - Firebase user object
 * @returns {void}
 */
function showSignedInUI(user) {
    const authStatus = document.getElementById('auth-status');
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');

    if (authStatus && authButtons && userInfo) {
        // Show user info with verification status
        const verificationStatus = user.emailVerified ? '✅' : '⚠️ Unverified';
        userInfo.innerHTML = `👤 ${user.displayName || user.email} ${verificationStatus}`;

        // Add verification button if not verified
        if (!user.emailVerified) {
            const verifyBtn = document.createElement('button');
            verifyBtn.textContent = 'Resend Verification';
            verifyBtn.className = 'auth-btn';
            verifyBtn.style.marginLeft = '10px';
            verifyBtn.onclick = sendEmailVerification;
            userInfo.appendChild(verifyBtn);
        }

        authStatus.style.display = 'block';

        // Hide sign-in buttons
        authButtons.style.display = 'none';
        hideEmailAuthForm();
    }
}

/**
 * Shows the signed-out UI state
 * @function showSignedOutUI
 * @returns {void}
 */
function showSignedOutUI() {
    const authStatus = document.getElementById('auth-status');
    const authButtons = document.getElementById('auth-buttons');

    if (authStatus && authButtons) {
        // Hide user info
        authStatus.style.display = 'none';

        // Show sign-in buttons
        authButtons.style.display = 'block';
        hideEmailAuthForm();
    }
}

/**
 * Shows the email authentication form
 * @function showEmailAuthForm
 * @returns {void}
 */
function showEmailAuthForm() {
    // Check if Firebase auth is properly configured
    if (!window.firebaseAuth || !window.firebaseModules) {
        console.log('Firebase not available, showing offline mode');
        showOfflineMode();
        return;
    }

    const emailForm = document.getElementById('email-auth-form');
    const authButtons = document.getElementById('auth-buttons');

    if (emailForm && authButtons) {
        emailForm.style.display = 'block';
        authButtons.style.display = 'none';

        // Clear form
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';

        // Focus email field
        document.getElementById('auth-email').focus();
    }
}

/**
 * Hides the email authentication form
 * @function hideEmailAuthForm
 * @returns {void}
 */
function hideEmailAuthForm() {
    const emailForm = document.getElementById('email-auth-form');
    const authButtons = document.getElementById('auth-buttons');

    if (emailForm && authButtons && !currentUser) {
        emailForm.style.display = 'none';
        authButtons.style.display = 'block';
    }
}

/**
 * Shows offline-only mode when Firebase is unavailable
 * @function showOfflineMode
 * @returns {void}
 */
function showOfflineMode() {
    const authSection = document.getElementById('auth-section');
    const authButtons = document.getElementById('auth-buttons');

    if (authButtons) {
        authButtons.innerHTML = '<div style="color: #666; font-size: 0.9em; padding: 5px;">📱 Offline Mode - All data saved locally</div>';
        authButtons.style.display = 'block';
    }

    // Hide email form if visible
    const emailForm = document.getElementById('email-auth-form');
    if (emailForm) {
        emailForm.style.display = 'none';
    }
}

/**
 * Gets the current authenticated user
 * @function getCurrentUser
 * @returns {Object|null} Current user or null if not authenticated
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Checks if user is authenticated
 * @function isAuthenticated
 * @returns {boolean} True if user is signed in
 */
function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Gets the current user ID
 * @function getUserId
 * @returns {string|null} User ID or null if not authenticated
 */
function getUserId() {
    return currentUser ? currentUser.uid : null;
}

/**
 * Validates if email domain is allowed
 * @function isValidEmailDomain
 * @param {string} email - Email address to validate
 * @returns {boolean} True if domain is allowed
 */
function isValidEmailDomain(email) {
    const allowedDomains = [
        '@clearconnectionsc.ca',
        '@clearconn.ca',
        '@clearconnectionsltd.ca'
    ];

    const emailLower = email.toLowerCase();
    return allowedDomains.some(domain => emailLower.endsWith(domain));
}

/**
 * Checks if current user's email is verified
 * @function isEmailVerified
 * @returns {boolean} True if user is signed in and email is verified
 */
function isEmailVerified() {
    return currentUser && currentUser.emailVerified;
}

/**
 * Sends email verification to current user
 * @async
 * @function sendEmailVerification
 * @returns {Promise<void>}
 */
async function sendEmailVerification() {
    if (!currentUser) {
        throw new Error('No user signed in');
    }

    try {
        await window.firebaseModules.sendEmailVerification(currentUser);
        window.uiManager.showNotification('Verification email sent! Please check your inbox.');
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
}

// Enhanced authentication manager initialization function for external use
function initializeAuthManager() {
    window.secureLog.info('[AUTH] 🔐 Initializing Microsoft SSO authentication manager...');

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

    window.secureLog.info('[AUTH] ✅ Microsoft SSO authentication manager initialized');
    return true;
}

// Export enhanced authentication functions globally
window.authManager = {
    // Core authentication functions
    initializeAuth,
    initializeAuthManager,
    getCurrentUser,
    isAuthenticated,
    getUserId,
    signOutUser,

    // Microsoft SSO functions
    signInWithMicrosoft,
    validateCompanyEmail,
    initializeMicrosoftProvider,

    // Legacy functions for backward compatibility during transition
    clearAllLocalData,
    clearServiceWorkerCache,
    showLogoutProgress,
    updateLogoutStep,
    isValidEmailDomain,
    isEmailVerified,
    sendEmailVerification,

    // State management
    isInitializing: true, // Start as initializing
    onAuthStateChanged: (callback) => {
        // Store callback for future use
        if (!window.authManager._callbacks) {
            window.authManager._callbacks = [];
        }
        window.authManager._callbacks.push(callback);

        // Call immediately with current user state
        callback(currentUser);
    }
};

window.secureLog.info('[AUTH] Enhanced Authentication Manager with Microsoft SSO loaded');