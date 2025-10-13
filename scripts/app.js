// Global application state
window.appState = {
    currentPayPeriodStart: null
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registered');
                initializeApp();
            })
            .catch(err => {
                console.error('ServiceWorker registration failed:', err);
                initializeApp();
            });
    } else {
        initializeApp();
    }
});

function initializeApp() {
    // Initialize currentPayPeriodStart if not already set
    if (!window.appState.currentPayPeriodStart) {
        window.appState.currentPayPeriodStart = window.dateUtils.getCurrentPayPeriodStart();
    }
    
    window.dbFunctions.initDB().then(async () => {
        await window.settingsManager.loadSettings();
        setupPayPeriodControls();
        window.entryManager.loadEntries();
        setupEventListeners();
        window.entryManager.initializeDate();
        window.calculations.calculateEarnings();
    }).catch(error => {
        console.error('DB initialization failed:', error);
        window.uiManager.showNotification('Failed to initialize database', true);
    });
}

function setupPayPeriodControls() {
    const prevBtn = document.getElementById('prev-pay-period');
    const nextBtn = document.getElementById('next-pay-period');
    
    window.uiManager.updatePayPeriodDisplay();
    
    prevBtn.addEventListener('click', () => {
        window.appState.currentPayPeriodStart = window.dateUtils.getAdjacentPeriod(window.appState.currentPayPeriodStart, -1);
        window.uiManager.updatePayPeriodDisplay();
        window.entryManager.loadEntries();
    });
    
    nextBtn.addEventListener('click', () => {
        const nextPeriod = window.dateUtils.getAdjacentPeriod(window.appState.currentPayPeriodStart, 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (new Date(nextPeriod) <= today) {
            window.appState.currentPayPeriodStart = nextPeriod;
            window.uiManager.updatePayPeriodDisplay();
            window.entryManager.loadEntries();
        } else {
            window.uiManager.showNotification("Cannot view future pay periods", true);
        }
    });
}



function setupEventListeners() {
    document.getElementById('save-entry').addEventListener('click', window.entryManager.saveEntry);
    document.getElementById('clear-form').addEventListener('click', window.entryManager.clearForm);
    document.getElementById('settings-toggle').addEventListener('click', window.uiManager.toggleSettings);
    document.getElementById('save-settings').addEventListener('click', window.settingsManager.saveSettings);
    
    document.getElementById('points').addEventListener('input', window.calculations.calculateEarnings);
    document.getElementById('kms').addEventListener('input', window.calculations.calculateEarnings);
    document.getElementById('per-diem').addEventListener('change', window.calculations.calculateEarnings);
    
    // Add expense input listeners
    document.getElementById('hotel-expense').addEventListener('input', window.calculations.calculateEarnings);
    document.getElementById('gas-expense').addEventListener('input', window.calculations.calculateEarnings);
    document.getElementById('food-expense').addEventListener('input', window.calculations.calculateEarnings);
    
    // Add date change listener for auto-population
    document.getElementById('work-date').addEventListener('change', (e) => {
        window.entryManager.checkAndPopulateExistingEntry(e.target.value);
    });
    
    // Add land location button listener
    document.getElementById('addloc').addEventListener('click', window.locationManager.addLandLocation);
    
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