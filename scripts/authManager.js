/**
 * Authentication Manager Module
 * Handles Firebase authentication including Google Sign-In and email/password
 * Manages user state and provides authentication UI control
 */

// Current user state
let currentUser = null;
let authInitialized = false;

/**
 * Initializes authentication system and sets up UI event listeners
 * @async
 * @function initializeAuth
 * @returns {Promise<void>}
 */
async function initializeAuth() {
    try {
        console.log('🔐 Initializing authentication...');
        
        // Mark as initializing
        window.authManager.isInitializing = true;
        
        // Wait for Firebase to be available
        await waitForFirebase();
        
        // Set up auth state listener
        window.firebaseModules.onAuthStateChanged(window.firebaseAuth, (user) => {
            handleAuthStateChange(user);
        });
        
        // Set up UI event listeners
        setupAuthEventListeners();
        
        authInitialized = true;
        console.log('✅ Authentication initialized');
        
        window.authManager.isInitializing = false;
        console.log('✅ Authentication initialized');
        
    } catch (error) {
        console.error('❌ Error initializing authentication:', error);
        window.authManager.isInitializing = false;
        
        if (error.message && error.message.includes('configuration-not-found')) {
            console.log('🔧 Firebase Authentication not configured - using offline mode');
            showOfflineMode();
        } else {
            console.log('🔧 Authentication unavailable - using offline mode');
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
 * Handles authentication state changes
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
                console.error('Error in auth state change callback:', error);
            }
        });
    }
    
    if (user) {
        console.log('👤 User signed in:', user.email);
        
        // Check if user's email is verified
        if (!user.emailVerified) {
            console.log('📧 Email not verified, redirecting to login...');
            // Redirect to login page for verification
            if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
                return;
            }
        } else {
            // User is verified - ensure they're on the main app
            if (window.location.pathname === '/login.html' || window.location.pathname.endsWith('login.html')) {
                console.log('✅ User verified, redirecting to main app...');
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
        console.log('👤 User signed out');
        
        // Redirect to login page if on main app
        if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('login.html')) {
            console.log('🔒 No user, redirecting to login...');
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
 * Signs out the current user and redirects to login page
 * 
 * @async
 * @function signOutUser
 * @returns {Promise<void>}
 */
async function signOutUser() {
    try {
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
        
        // Step 3: Firebase sign out
        updateLogoutStep('step-firebase-signout', 'active');
        document.getElementById('logout-status-text').textContent = 'Signing out from Firebase...';
        await window.firebaseModules.signOut(window.firebaseAuth);
        currentUser = null;
        updateLogoutStep('step-firebase-signout', 'completed');
        console.log('👋 User signed out, redirecting to login...');
        
        // Step 4: Redirect
        updateLogoutStep('step-redirecting', 'active');
        document.getElementById('logout-status-text').textContent = 'Redirecting to login page...';
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay to show completion
        updateLogoutStep('step-redirecting', 'completed');
        
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        
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
        
        throw error;
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

// Make functions available globally
window.authManager = {
    initializeAuth,
    getCurrentUser,
    isAuthenticated,
    getUserId,
    signOutUser,
    clearAllLocalData,
    clearServiceWorkerCache,
    showLogoutProgress,
    updateLogoutStep,
    isValidEmailDomain,
    isEmailVerified,
    sendEmailVerification,
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