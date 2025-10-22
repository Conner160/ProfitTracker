/**
 * 🔒 Environment Configuration
 * 
 * SECURITY NOTICE:
 * - Firebase API keys are safe to expose in client-side code
 * - Firebase security is enforced through Firestore security rules
 * - However, for enterprise security, consider environment variables
 * 
 * PRODUCTION DEPLOYMENT:
 * - Replace these values with environment-specific configurations
 * - Consider using build-time variable substitution
 * - Implement proper CI/CD with secret management
 */

// 🔧 Development Mode Detection
const IS_DEVELOPMENT = (function () {
    // Check if running on localhost or development environment
    return location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        location.hostname.includes('github.io') ||
        location.search.includes('dev=true');
})();

// 🔒 Firebase Configuration
const FIREBASE_CONFIG = {
    // Production Firebase Configuration
    production: {
        apiKey: "AIzaSyAlVo_EYRnSTgnB55J-LRFpKG6ZGvA88_w",
        authDomain: "profittrackerccc.firebaseapp.com",
        projectId: "profittrackerccc",
        storageBucket: "profittrackerccc.firebasestorage.app",
        messagingSenderId: "272024960605",
        appId: "1:272024960605:web:bffdb40e154d4e7eac57b4"
    },

    // Development Firebase Configuration (same for now, but can be different)
    development: {
        apiKey: "AIzaSyAlVo_EYRnSTgnB55J-LRFpKG6ZGvA88_w",
        authDomain: "profittrackerccc.firebaseapp.com",
        projectId: "profittrackerccc",
        storageBucket: "profittrackerccc.firebasestorage.app",
        messagingSenderId: "272024960605",
        appId: "1:272024960605:web:bffdb40e154d4e7eac57b4"
    }
};

// 🛡️ Secure Console Logging for Client-side
const secureLog = {
    log: (...args) => IS_DEVELOPMENT && console.log('[APP]', ...args),
    warn: (...args) => IS_DEVELOPMENT && console.warn('[APP]', ...args),
    error: (...args) => console.error('[APP]', ...args), // Always log errors
    info: (...args) => IS_DEVELOPMENT && console.info('[APP]', ...args),
    debug: (...args) => IS_DEVELOPMENT && console.debug('[APP]', ...args)
};

// Make secureLog available immediately to prevent errors
if (typeof window !== 'undefined') {
    window.secureLog = secureLog;
}

// 🌍 Environment-specific Configuration
const ENV_CONFIG = {
    IS_DEVELOPMENT,
    FIREBASE: IS_DEVELOPMENT ? FIREBASE_CONFIG.development : FIREBASE_CONFIG.production,
    API_RATE_LIMIT: IS_DEVELOPMENT ? 1000 : 100, // Requests per minute
    CACHE_DURATION: IS_DEVELOPMENT ? 300 : 3600, // Cache duration in seconds
    DEBUG_MODE: IS_DEVELOPMENT,

    // 🔐 Microsoft Azure AD Configuration for SSO Integration
    MICROSOFT: {
        clientId: "12345678-1234-1234-1234-123456789abc", // Replace with actual client ID from Azure
        tenantId: "87654321-4321-4321-4321-cba987654321", // Replace with actual tenant ID from Azure
        redirectUri: window.location.origin + "/ProfitTracker/",
        scopes: ["User.Read", "email", "openid", "profile"]
    },

    // 🏢 Clear Connections Company Domain Validation
    COMPANY_DOMAINS: [
        'clearconnectionsc.ca',
        'clearconn.ca',
        'clearconnectionsltd.ca'
    ]
};

// Make available globally
window.ENV_CONFIG = ENV_CONFIG;
window.IS_DEVELOPMENT = IS_DEVELOPMENT;

// Log environment detection (only in development)
secureLog.info('Environment detected:', IS_DEVELOPMENT ? 'DEVELOPMENT' : 'PRODUCTION');
secureLog.info('[ENV] Microsoft SSO configuration loaded for Clear Connections');