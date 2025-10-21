/**
 * Login Page JavaScript
 * Handles authentication logic for the dedicated login page
 * Manages sign in, sign up, email verification, and redirects
 * Supports Clear Connections email aliases and username-only signin
 */

// 🏢 Clear Connections Email Domain Configuration
const COMPANY_DOMAINS = [
    'clearconnectionsc.ca',
    'clearconn.ca',
    'clearconnectionsltd.ca'
];

// 📧 Primary domain for account creation (canonical domain)
const PRIMARY_DOMAIN = 'clearconnectionsc.ca';

/**
 * Normalize email input to handle username-only and alias domains
 * @param {string} emailInput - User input (could be username or full email)
 * @returns {string} - Normalized full email address
 */
function normalizeEmailInput(emailInput) {
    emailInput = emailInput.trim().toLowerCase();

    // If no @ symbol, assume username and add primary domain
    if (!emailInput.includes('@')) {
        return `${emailInput}@${PRIMARY_DOMAIN}`;
    }

    // If it's already a full email, validate it's a company domain
    const [username, domain] = emailInput.split('@');

    if (COMPANY_DOMAINS.includes(domain)) {
        // For signin, try the exact domain they provided
        // For signup, normalize to primary domain
        return emailInput;
    }

    // Invalid domain
    throw new Error(`Invalid domain: ${domain}. Must be one of: ${COMPANY_DOMAINS.join(', ')}`);
}

/**
 * Get all possible email aliases for a username
 * @param {string} username - The username part (before @)
 * @returns {string[]} - Array of all possible email variations
 */
function getEmailAliases(username) {
    return COMPANY_DOMAINS.map(domain => `${username}@${domain}`);
}

/**
 * Validate if email is a valid company email
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid company email
 */
function isValidCompanyEmail(email) {
    try {
        const [username, domain] = email.toLowerCase().split('@');
        return username && COMPANY_DOMAINS.includes(domain);
    } catch {
        return false;
    }
}

// 📧 Email verification configuration for Clear Connections branding
const EMAIL_ACTION_CODE_SETTINGS = {
    // URL to redirect to after email verification
    url: window.location.origin + '/index.html',
    handleCodeInApp: true
};

// DOM elements
let signinTab, signupTab, signinForm, signupForm;
let loadingSpinner, authTabs, verificationNotice, errorMessage;
let signinButton, signupButton, resendButton;

// Authentication state
let currentUser = null;
let isInitializing = true;

/**
 * Initialize the login page
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔐 Login page initializing...');

    // Get DOM elements
    initializeDOMElements();

    // Set up event listeners
    setupEventListeners();

    // Wait for Firebase to be available
    await waitForFirebase();

    // Check authentication state
    checkAuthenticationState();
});

/**
 * Initialize DOM element references
 */
function initializeDOMElements() {
    // Tabs and forms
    signinTab = document.getElementById('signin-tab');
    signupTab = document.getElementById('signup-tab');
    signinForm = document.getElementById('signin-form');
    signupForm = document.getElementById('signup-form');

    // UI elements
    loadingSpinner = document.getElementById('loading-spinner');
    authTabs = document.getElementById('auth-tabs');
    verificationNotice = document.getElementById('verification-notice');
    errorMessage = document.getElementById('error-message');

    // Buttons
    signinButton = document.getElementById('signin-button');
    signupButton = document.getElementById('signup-button');
    resendButton = document.getElementById('resend-verification');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Tab switching
    signinTab.addEventListener('click', () => switchTab('signin'));
    signupTab.addEventListener('click', () => switchTab('signup'));

    // Form submissions
    signinForm.addEventListener('submit', handleSignIn);
    signupForm.addEventListener('submit', handleSignUp);

    // Resend verification
    resendButton.addEventListener('click', handleResendVerification);

    // Password confirmation validation
    const confirmPassword = document.getElementById('signup-confirm');
    const password = document.getElementById('signup-password');

    confirmPassword.addEventListener('input', () => {
        if (confirmPassword.value && password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Passwords do not match');
        } else {
            confirmPassword.setCustomValidity('');
        }
    });
}

/**
 * Wait for Firebase to be available
 */
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.firebaseAuth && window.firebaseModules) {
                console.log('🔥 Firebase ready for login');
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

/**
 * Check current authentication state
 */
function checkAuthenticationState() {
    console.log('🔍 Checking authentication state...');

    // Set up auth state listener
    window.firebaseModules.onAuthStateChanged(window.firebaseAuth, (user) => {
        console.log('👤 Auth state changed:', user ? user.email : 'No user');

        currentUser = user;

        if (user) {
            if (user.emailVerified) {
                // User is signed in and verified - redirect to main app
                console.log('✅ User authenticated and verified, redirecting...');
                redirectToApp();
            } else {
                // User signed in but not verified
                console.log('📧 User signed in but email not verified');
                showVerificationNotice();
            }
        } else {
            // No user signed in - show login forms
            console.log('🔓 No user signed in, showing login forms');
            showLoginForms();
        }

        isInitializing = false;
    });
}

/**
 * Switch between signin and signup tabs
 */
function switchTab(tab) {
    hideError();
    hideVerificationNotice();

    if (tab === 'signin') {
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
        signinForm.classList.add('active');
        signupForm.classList.remove('active');
        signinForm.removeAttribute('style'); // Let CSS styling take over
        signupForm.style.display = 'none';
    } else {
        signupTab.classList.add('active');
        signinTab.classList.remove('active');
        signupForm.classList.add('active');
        signinForm.classList.remove('active');
        signupForm.removeAttribute('style'); // Let CSS styling take over
        signinForm.style.display = 'none';
    }
}

/**
 * Handle sign in form submission with email alias support
 */
async function handleSignIn(e) {
    e.preventDefault();
    hideError();
    hideVerificationNotice();

    const emailInput = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!emailInput || !password) {
        showError('Please enter both email/username and password');
        return;
    }

    try {
        setLoading(true, 'Signing in...');

        let signInSuccess = false;
        let userCredential = null;

        // Try to normalize the email input
        try {
            const normalizedEmail = normalizeEmailInput(emailInput);

            // If input was just a username, try all domain aliases
            if (!emailInput.includes('@')) {
                const username = emailInput.toLowerCase();
                const aliases = getEmailAliases(username);

                window.secureLog.log(`🔍 Trying signin for username '${username}' with aliases:`, aliases);

                // Try each alias until one works
                for (const alias of aliases) {
                    try {
                        userCredential = await window.firebaseModules.signInWithEmailAndPassword(
                            window.firebaseAuth,
                            alias,
                            password
                        );
                        signInSuccess = true;
                        window.secureLog.log(`✅ Sign in successful with alias: ${alias}`);
                        break;
                    } catch (aliasError) {
                        window.secureLog.log(`❌ Failed with ${alias}:`, aliasError.code);
                        continue; // Try next alias
                    }
                }
            } else {
                // Direct email signin
                userCredential = await window.firebaseModules.signInWithEmailAndPassword(
                    window.firebaseAuth,
                    normalizedEmail,
                    password
                );
                signInSuccess = true;
                window.secureLog.log(`✅ Sign in successful with email: ${normalizedEmail}`);
            }
        } catch (normalizeError) {
            showError(normalizeError.message);
            return;
        }

        if (!signInSuccess) {
            throw new Error('Invalid email/username or password');
        }

        if (!userCredential.user.emailVerified) {
            window.secureLog.log('📧 Email not verified');
            showVerificationNotice();
        }
        // Auth state change will handle redirect if verified

    } catch (error) {
        window.secureLog.error('❌ Sign in error:', error);
        handleAuthError(error);
    } finally {
        setLoading(false);
    }
}

/**
 * Handle sign up form submission with email normalization
 */
async function handleSignUp(e) {
    e.preventDefault();
    hideError();
    hideVerificationNotice();

    const emailInput = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;

    // Validation
    if (!emailInput || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    try {
        // Normalize email input and validate
        const normalizedEmail = normalizeEmailInput(emailInput);

        // For signup, always use primary domain to create canonical account
        const [username] = normalizedEmail.split('@');
        const canonicalEmail = `${username}@${PRIMARY_DOMAIN}`;

        if (!isValidCompanyEmail(canonicalEmail)) {
            showError(`Please use a valid company email address (${COMPANY_DOMAINS.join(', ')})`);
            return;
        }

        setLoading(true, 'Creating account...');

        window.secureLog.log(`🆕 Creating account for: ${canonicalEmail}`);

        const userCredential = await window.firebaseModules.createUserWithEmailAndPassword(
            window.firebaseAuth,
            canonicalEmail,
            password
        );

        window.secureLog.log('✅ Account created:', userCredential.user.email);

        // Send verification email with Clear Connections branding
        await window.firebaseModules.sendEmailVerification(userCredential.user, EMAIL_ACTION_CODE_SETTINGS);
        window.secureLog.log('📧 Verification email sent from Clear Connections Contracting Ltd Management');

        showVerificationNotice();

        // Show success message with alias info
        showError(`Account created! You can sign in using '${username}' or any company email alias (${COMPANY_DOMAINS.join(', ')}). Please check your email for verification.`, false);

    } catch (normalizeError) {
        if (normalizeError.message.includes('Invalid domain')) {
            showError(normalizeError.message);
        } else {
            window.secureLog.error('❌ Sign up error:', normalizeError);
            handleAuthError(normalizeError);
        }
    } finally {
        setLoading(false);
    }
}

/**
 * Handle resend verification
 */
async function handleResendVerification() {
    if (!currentUser) {
        showError('No user signed in');
        return;
    }

    try {
        setLoading(true, 'Sending verification email...');

        // Send verification email with Clear Connections branding
        await window.firebaseModules.sendEmailVerification(currentUser, EMAIL_ACTION_CODE_SETTINGS);
        window.secureLog.log('📧 Verification email resent from Clear Connections Contracting Ltd Management');

        showError('Verification email sent from Clear Connections Contracting Ltd Management! Please check your inbox.', false);
    } catch (error) {
        console.error('❌ Resend verification error:', error);
        handleAuthError(error);
    } finally {
        setLoading(false);
    }
}

/**
 * Validate company email domains
 */
function isValidCompanyEmail(email) {
    const validDomains = [
        '@clearconnectionsc.ca',
        '@clearconn.ca',
        '@clearconnectionsltd.ca'
    ];

    return validDomains.some(domain => email.toLowerCase().endsWith(domain));
}

/**
 * Handle authentication errors
 */
function handleAuthError(error) {
    let message = 'An error occurred. Please try again.';

    switch (error.code) {
        case 'auth/user-not-found':
            message = 'No account found with this email address';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
        case 'auth/email-already-in-use':
            message = 'An account with this email already exists';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak. Please choose a stronger password.';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address format';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please wait before trying again.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your connection.';
            break;
        default:
            message = error.message || message;
    }

    showError(message);
}

/**
 * Show login forms
 */
function showLoginForms() {
    loadingSpinner.style.display = 'none';
    authTabs.style.display = 'flex';
    signinForm.style.display = 'block';
    hideVerificationNotice();
}

/**
 * Show verification notice
 */
function showVerificationNotice() {
    loadingSpinner.style.display = 'none';
    authTabs.style.display = 'none';
    signinForm.style.display = 'none';
    signupForm.style.display = 'none';
    verificationNotice.classList.add('show');
}

/**
 * Hide verification notice
 */
function hideVerificationNotice() {
    verificationNotice.classList.remove('show');
}

/**
 * Show error message
 */
function showError(message, isError = true) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');

    if (isError) {
        errorMessage.style.background = '#f8d7da';
        errorMessage.style.borderColor = '#f5c6cb';
        errorMessage.style.color = '#721c24';
    } else {
        errorMessage.style.background = '#d4edda';
        errorMessage.style.borderColor = '#c3e6cb';
        errorMessage.style.color = '#155724';
    }
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.remove('show');
}

/**
 * Set loading state
 */
function setLoading(loading, message = 'Loading...') {
    if (loading) {
        signinButton.disabled = true;
        signupButton.disabled = true;
        resendButton.disabled = true;
        loadingSpinner.querySelector('span').textContent = message;
        loadingSpinner.classList.add('show');
    } else {
        signinButton.disabled = false;
        signupButton.disabled = false;
        resendButton.disabled = false;
        loadingSpinner.classList.remove('show');
    }
}

/**
 * Show login forms and hide loading spinner
 */
function showLoginForms() {
    console.log('📋 Showing login forms...');

    // Hide loading spinner
    loadingSpinner.style.display = 'none';

    // Show auth tabs and forms - remove inline styles to allow CSS to take control
    authTabs.removeAttribute('style'); // Let CSS flex styling take over
    signinForm.removeAttribute('style'); // Let CSS styling take over
    signupForm.style.display = 'none'; // Start with signin form hidden

    // Hide other UI elements
    hideVerificationNotice();
    hideError();

    // Ensure signin tab is active by default
    switchTab('signin');
}

/**
 * Show verification notice and hide other elements
 */
function showVerificationNotice() {
    console.log('📧 Showing verification notice...');

    // Hide loading spinner and forms
    loadingSpinner.style.display = 'none';
    authTabs.style.display = 'none';
    signinForm.style.display = 'none';
    signupForm.style.display = 'none';

    // Show verification notice
    verificationNotice.style.display = 'block';
    verificationNotice.classList.add('show');

    hideError();
}

/**
 * Redirect to main app
 */
function redirectToApp() {
    console.log('🚀 Redirecting to main app...');
    // Add a small delay to show success state
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
}

// Export for potential external use
window.loginManager = {
    currentUser,
    isInitializing,
    redirectToApp
};