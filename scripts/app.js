/**
 * Main Application Controller
 * Coordinates all modules and handles application initialization, event setup,
 * and pay period navigation. This is the entry point that orchestrates the
 * entire ProfitTracker application lifecycle.
 */

// Global application state container
window.appState = {
    currentPayPeriodStart: null // Tracks which pay period is currently being viewed
};

/**
 * Main application initialization - entry point after DOM loads
 * Sets up service worker for PWA functionality, then starts app initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    // Display version info in console
    console.log('🚀 ProfitTracker App Loading...');

    // Get version from service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            // Send a message to the service worker to get the cache name
            if (registration.active) {
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.type === 'CACHE_NAME_RESPONSE') {
                        console.log('📦 App Version:', event.data.cacheName);
                    }
                };
                registration.active.postMessage(
                    { type: 'GET_CACHE_NAME' },
                    [messageChannel.port2]
                );
            }
        });
    }

    // Register service worker for offline functionality (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registered. Version:', window.CACHE_NAME);
                initializeApp();
            })
            .catch(err => {
                console.error('ServiceWorker registration failed:', err);
                initializeApp(); // Continue without service worker
            });
    } else {
        initializeApp(); // No service worker support
    }
});

/**
 * Checks if user is authenticated and redirects to login if not
 * This is the authentication guard for the main app
 * 
 * @function checkAuthentication
 * @returns {Promise<boolean>} True if authenticated, false if redirected
 */
async function checkAuthentication() {
    console.log('🔐 Checking authentication...');

    // Wait for Firebase to be available
    await waitForFirebase();

    return new Promise((resolve) => {
        // Set up auth state listener
        window.firebaseModules.onAuthStateChanged(window.firebaseAuth, (user) => {
            if (user && user.emailVerified) {
                console.log('✅ User authenticated:', user.email);
                resolve(true);
            } else {
                console.log('🔒 User not authenticated, redirecting to login...');
                window.location.href = 'login.html';
                resolve(false);
            }
        });
    });
}

/**
 * Wait for Firebase to be available
 * @returns {Promise<void>}
 */
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.firebaseAuth && window.firebaseModules) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

/**
 * Initializes all application components in correct dependency order
 * Only runs after authentication is confirmed
 * 
 * @function initializeApp
 * @returns {Promise<void>}
 */
async function initializeApp() {
    console.log('🚀 Initializing authenticated app...');

    // First check authentication - redirect if not authenticated
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return; // User was redirected to login
    }

    // Set initial pay period to current period if not already set
    if (!window.appState.currentPayPeriodStart) {
        window.appState.currentPayPeriodStart = window.dateUtils.getCurrentPayPeriodStart();
    }

    // Initialize database
    await window.dbFunctions.initDB();

    // Set up UI components and navigation
    setupPayPeriodControls();
    setupEventListeners();

    // Initialize authentication manager (but auth is already confirmed)
    if (window.authManager) {
        await window.authManager.initializeAuth();
    }

    // Migration and local-to-cloud transfers disabled: no automatic migration checks

    // Load user data now that authentication is confirmed
    console.log('📊 Loading user data...');

    // Load user settings
    if (window.settingsManager?.loadSettings) {
        await window.settingsManager.loadSettings();
    }

    // Load user entries
    if (window.entryManager?.loadEntries) {
        await window.entryManager.loadEntries();
    }

    // Initialize date picker with today's date
    window.entryManager.initializeDate();

    // Calculate and display current form earnings
    window.calculations.calculateEarnings();

    // Initialize drag and drop for any existing land locations
    window.locationManager.initializeDragAndDrop();

    console.log('✅ App initialization complete');
}

/**
 * Sets up pay period navigation controls and event handlers
 * Configures previous/next buttons with appropriate date validation
 * and updates the UI display when periods change.
 * 
 * @function setupPayPeriodControls
 * @returns {void}
 */
function setupPayPeriodControls() {
    const prevBtn = document.getElementById('prev-pay-period');
    const nextBtn = document.getElementById('next-pay-period');

    // Display current pay period information
    window.uiManager.updatePayPeriodDisplay();

    // Previous pay period button handler
    prevBtn.addEventListener('click', () => {
        window.appState.currentPayPeriodStart = window.dateUtils.getAdjacentPeriod(window.appState.currentPayPeriodStart, -1);
        window.uiManager.updatePayPeriodDisplay();
        window.entryManager.loadEntries();
    });

    // Next pay period button handler with future date validation
    nextBtn.addEventListener('click', () => {
        const nextPeriod = window.dateUtils.getAdjacentPeriod(window.appState.currentPayPeriodStart, 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Only allow navigation to pay periods that have started
        if (new Date(nextPeriod) <= today) {
            window.appState.currentPayPeriodStart = nextPeriod;
            window.uiManager.updatePayPeriodDisplay();
            window.entryManager.loadEntries();
        } else {
            window.uiManager.showNotification("Cannot view future pay periods", true);
        }
    });
}



/**
 * Sets up all event listeners for form interactions and user input
 * Configures handlers for save/clear operations, settings management,
 * calculation triggers, and dynamic form behavior.
 * 
 * @function setupEventListeners
 * @returns {void}
 */
function setupEventListeners() {
    // Primary form action buttons
    document.getElementById('save-entry').addEventListener('click', window.entryManager.saveEntry);
    document.getElementById('clear-form').addEventListener('click', window.entryManager.clearForm);

    // Settings panel controls
    document.getElementById('settings-toggle').addEventListener('click', window.uiManager.toggleSettings);
    document.getElementById('save-settings').addEventListener('click', window.settingsManager.saveSettings);

    // Earnings input fields - recalculate on each change
    document.getElementById('points').addEventListener('input', window.calculations.calculateEarnings);
    document.getElementById('kms').addEventListener('input', window.calculations.calculateEarnings);

    // Per diem radio buttons - recalculate on change
    document.querySelectorAll('input[name="per-diem"]').forEach(radio => {
        radio.addEventListener('change', window.calculations.calculateEarnings);
    });

    // Expense input fields - update calculations immediately
    document.getElementById('hotel-expense').addEventListener('input', window.calculations.calculateEarnings);
    document.getElementById('gas-expense').addEventListener('input', window.calculations.calculateEarnings);
    document.getElementById('food-expense').addEventListener('input', window.calculations.calculateEarnings);

    // Date selector - check for existing entries when date changes
    document.getElementById('work-date').addEventListener('change', (e) => {
        window.entryManager.checkAndPopulateExistingEntry(e.target.value);
    });

    // Land location management
    document.getElementById('addloc').addEventListener('click', window.locationManager.addLandLocation);

    // Map generation
    document.getElementById('generate-map').addEventListener('click', window.mapGenerator.handleGenerateMap);

    // Travel sheet generation
    document.getElementById('generate-travel-sheet').addEventListener('click', window.travelSheetGenerator.handleGenerateTravelSheet);

    // Settings changes that affect calculations and display
    // Recalculate current form AND reload entries list when rates change
    document.getElementById('point-rate').addEventListener('change', () => {
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
    });
    document.getElementById('km-rate').addEventListener('change', () => {
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
    });
    document.getElementById('per-diem-full-rate').addEventListener('input', () => {
        window.settingsManager.updatePerDiemLabels();
    });
    document.getElementById('per-diem-full-rate').addEventListener('change', () => {
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
    });
    document.getElementById('per-diem-partial-rate').addEventListener('input', () => {
        window.settingsManager.updatePerDiemLabels();
    });
    document.getElementById('per-diem-partial-rate').addEventListener('change', () => {
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
    });
    document.getElementById('gst-enabled').addEventListener('change', () => {
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
    });

    // Tech code validation on input
    document.getElementById('tech-code').addEventListener('input', (e) => {
        const value = e.target.value.toUpperCase();
        if (value && !/^[A-Z]?\d{0,3}$/.test(value)) {
            e.target.setCustomValidity('Tech code must be a letter followed by 3 digits (e.g., A123)');
        } else {
            e.target.setCustomValidity('');
        }
        e.target.value = value; // Convert to uppercase
    });

    // Clear all data button
    document.getElementById('clear-all-data').addEventListener('click', window.settingsManager.handleClearAllData);
}