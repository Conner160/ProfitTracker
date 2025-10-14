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
    // Register service worker for offline functionality (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registered');
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
 * Initializes all application components in correct dependency order
 * Sets up database, loads user settings, configures UI components,
 * and initializes all module functionality.
 * 
 * @function initializeApp
 * @returns {void}
 */
function initializeApp() {
    // Set initial pay period to current period if not already set
    if (!window.appState.currentPayPeriodStart) {
        window.appState.currentPayPeriodStart = window.dateUtils.getCurrentPayPeriodStart();
    }
    
    // Initialize database and all dependent components
    window.dbFunctions.initDB().then(async () => {
        // Load user settings (rates, GST preference, etc.)
        await window.settingsManager.loadSettings();
        
        // Set up UI components and navigation
        setupPayPeriodControls();
        
        // Load and display entries for current pay period
        window.entryManager.loadEntries();
        
        // Set up all event listeners for form interactions
        setupEventListeners();
        
        // Initialize date picker with today's date
        window.entryManager.initializeDate();
        
        // Calculate and display current form earnings
        window.calculations.calculateEarnings();
        
        // Initialize drag and drop for any existing land locations
        window.locationManager.initializeDragAndDrop();
    }).catch(error => {
        console.error('DB initialization failed:', error);
        window.uiManager.showNotification('Failed to initialize database', true);
    });
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
    document.getElementById('per-diem').addEventListener('change', window.calculations.calculateEarnings);
    
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
    document.getElementById('per-diem-rate').addEventListener('change', () => {
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
    });
    document.getElementById('gst-enabled').addEventListener('change', () => {
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
    });
}