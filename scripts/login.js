/**
 * Login Page JavaScript
 * Handles authentication logic for the dedicated login page
 * Manages sign in, sign up, email verification, and redirects
 */

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
        signinForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        signupTab.classList.add('active');
        signinTab.classList.remove('active');
        signupForm.classList.add('active');
        signinForm.classList.remove('active');
        signupForm.style.display = 'block';
        signinForm.style.display = 'none';
    }
}

/**
 * Handle sign in form submission
 */
async function handleSignIn(e) {
    e.preventDefault();
    hideError();
    hideVerificationNotice();
    
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }
    
    try {
        setLoading(true, 'Signing in...');
        
        const userCredential = await window.firebaseModules.signInWithEmailAndPassword(
            window.firebaseAuth, 
            email, 
            password
        );
        
        console.log('✅ Sign in successful:', userCredential.user.email);
        
        if (!userCredential.user.emailVerified) {
            console.log('📧 Email not verified');
            showVerificationNotice();
        }
        // Auth state change will handle redirect if verified
        
    } catch (error) {
        console.error('❌ Sign in error:', error);
        handleAuthError(error);
    } finally {
        setLoading(false);
    }
}

/**
 * Handle sign up form submission
 */
async function handleSignUp(e) {
    e.preventDefault();
    hideError();
    hideVerificationNotice();
    
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    
    // Validation
    if (!email || !password || !confirmPassword) {
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
    
    if (!isValidCompanyEmail(email)) {
        showError('Please use a valid company email address (@clearconnectionsc.ca, @clearconn.ca, or @clearconnectionsltd.ca)');
        return;
    }
    
    try {
        setLoading(true, 'Creating account...');
        
        const userCredential = await window.firebaseModules.createUserWithEmailAndPassword(
            window.firebaseAuth, 
            email, 
            password
        );
        
        console.log('✅ Account created:', userCredential.user.email);
        
        // Send verification email
        await window.firebaseModules.sendEmailVerification(userCredential.user);
        console.log('📧 Verification email sent');
        
        showVerificationNotice();
        
    } catch (error) {
        console.error('❌ Sign up error:', error);
        handleAuthError(error);
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
        
        await window.firebaseModules.sendEmailVerification(currentUser);
        console.log('📧 Verification email resent');
        
        showError('Verification email sent! Please check your inbox.', false);
        
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