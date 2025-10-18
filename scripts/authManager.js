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
        
    } catch (error) {
        console.error('❌ Error initializing authentication:', error);
        // Show offline-only mode
        showOfflineMode();
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
        showSignedInUI(user);
        
        // Trigger sync when user signs in
        if (window.syncManager && window.syncManager.onUserSignIn) {
            window.syncManager.onUserSignIn(user);
        }
    } else {
        console.log('👤 User signed out');
        showSignedOutUI();
        
        // Handle sign out
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
    // Google Sign-In
    document.getElementById('sign-in-google-btn')?.addEventListener('click', signInWithGoogle);
    
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
 * Signs in user with Google
 * @async
 * @function signInWithGoogle
 * @returns {Promise<void>}
 */
async function signInWithGoogle() {
    try {
        const provider = new window.firebaseModules.GoogleAuthProvider();
        await window.firebaseModules.signInWithPopup(window.firebaseAuth, provider);
        window.uiManager.showNotification('Signed in successfully!');
    } catch (error) {
        console.error('Google sign-in error:', error);
        let message = 'Sign-in failed. ';
        if (error.code === 'auth/popup-closed-by-user') {
            message += 'Sign-in was cancelled.';
        } else if (error.code === 'auth/network-request-failed') {
            message += 'Network error. Please check your connection.';
        } else {
            message += 'Please try again.';
        }
        window.uiManager.showNotification(message, true);
    }
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
        if (error.code === 'auth/user-not-found') {
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
    
    if (password.length < 6) {
        window.uiManager.showNotification('Password must be at least 6 characters', true);
        return;
    }
    
    try {
        await window.firebaseModules.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        window.uiManager.showNotification('Account created successfully!');
        hideEmailAuthForm();
    } catch (error) {
        console.error('Email sign-up error:', error);
        let message = 'Sign-up failed. ';
        if (error.code === 'auth/email-already-in-use') {
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
 * Signs out the current user
 * @async
 * @function signOutUser
 * @returns {Promise<void>}
 */
async function signOutUser() {
    try {
        await window.firebaseModules.signOut(window.firebaseAuth);
        window.uiManager.showNotification('Signed out successfully');
    } catch (error) {
        console.error('Sign-out error:', error);
        window.uiManager.showNotification('Error signing out', true);
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
        // Show user info and sign-out button
        userInfo.textContent = `👤 ${user.displayName || user.email}`;
        authStatus.classList.remove('hidden');
        
        // Hide sign-in buttons
        authButtons.classList.add('hidden');
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
        authStatus.classList.add('hidden');
        
        // Show sign-in buttons
        authButtons.classList.remove('hidden');
        hideEmailAuthForm();
    }
}

/**
 * Shows the email authentication form
 * @function showEmailAuthForm
 * @returns {void}
 */
function showEmailAuthForm() {
    const emailForm = document.getElementById('email-auth-form');
    const authButtons = document.getElementById('auth-buttons');
    
    if (emailForm && authButtons) {
        emailForm.classList.remove('hidden');
        authButtons.classList.add('hidden');
        
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
        emailForm.classList.add('hidden');
        authButtons.classList.remove('hidden');
    }
}

/**
 * Shows offline-only mode when Firebase is unavailable
 * @function showOfflineMode
 * @returns {void}
 */
function showOfflineMode() {
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = '<span style="color: #666;">📱 Offline Mode - Data saved locally</span>';
        authButtons.classList.remove('hidden');
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

// Make functions available globally
window.authManager = {
    initializeAuth,
    getCurrentUser,
    isAuthenticated,
    getUserId,
    signOutUser,
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