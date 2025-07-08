// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }

    // Initialize database and load data
    window.dbFunctions.initDB().then(() => {
        loadSettings();
        loadEntries();
        setupEventListeners();
        updateDateDisplay();
    });
});

function setupEventListeners() {
    // Save entry button
    document.getElementById('save-entry').addEventListener('click', saveEntry);
    
    // Clear form button
    document.getElementById('clear-form').addEventListener('click', clearForm);
    
    // Settings toggle
    document.getElementById('settings-toggle').addEventListener('click', toggleSettings);
    
    // Save settings button
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Calculate earnings when inputs change
    document.getElementById('points').addEventListener('input', calculateEarnings);
    document.getElementById('kms').addEventListener('input', calculateEarnings);
    document.getElementById('per-diem').addEventListener('change', calculateEarnings);
}

function updateDateDisplay() {
    const dateDisplay = document.getElementById('date-display');
    const today = new Date();
    dateDisplay.textContent = today.toLocaleDateString('en-CA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Set default date to today
    document.getElementById('work-date').valueAsDate = today;
}

function calculateEarnings() {
    // This will be implemented to calculate and display earnings
    console.log('Calculating earnings...');
}

function saveEntry() {
    // This will save the entry to local storage
    console.log('Saving entry...');
}

function clearForm() {
    // This will clear the form
    console.log('Clearing form...');
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    settingsPanel.classList.toggle('hidden');
}

function loadSettings() {
    // This will load settings from local storage
    console.log('Loading settings...');
}

function saveSettings() {
    // This will save settings to local storage
    console.log('Saving settings...');
    toggleSettings();
}

function loadEntries() {
    // This will load past entries from local storage
    console.log('Loading entries...');
}
