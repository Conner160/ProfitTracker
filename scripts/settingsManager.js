/**
 * Settings Manager Module
 * Handles loading and saving user configuration settings including
 * pay rates for points, kilometers, full per diem, partial per diem, 
 * as well as GST preferences. Manages persistent storage of user preferences.
 */

// Default rate constants - fallback values if no saved settings exist
const POINT_BASE_RATE = 6.50;   // Default dollars per point earned
const KM_BASE_RATE = 0.85;      // Default dollars per kilometer driven
const PER_DIEM_FULL_RATE = 171;  // Default full per diem daily rate
const PER_DIEM_PARTIAL_RATE = 46; // Default partial per diem daily rate

/**
 * Loads saved settings from database and populates the settings form
 * Retrieves user preferences from IndexedDB and updates all rate input
 * fields with saved values. Falls back to default constants if no saved
 * settings exist. Called during app initialization.
 * 
 * @async
 * @function loadSettings
 * @returns {Promise<void>} Resolves when settings are loaded and form is populated
 */
async function loadSettings() {
    try {
        // Retrieve settings from database using 'rates' key
        const settings = await window.dbFunctions.getFromDB('settings', 'rates');
        if (settings) {
            // Populate form fields with saved values or defaults
            document.getElementById('point-rate').value = settings.pointRate || POINT_BASE_RATE;
            document.getElementById('km-rate').value = settings.kmRate || KM_BASE_RATE;
            document.getElementById('per-diem-full-rate').value = settings.perDiemFullRate || PER_DIEM_FULL_RATE;
            document.getElementById('per-diem-partial-rate').value = settings.perDiemPartialRate || PER_DIEM_PARTIAL_RATE;
            document.getElementById('gst-enabled').checked = settings.includeGST !== false;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Saves current settings form values to database and refreshes calculations
 * Collects all rate inputs and GST preference from form, saves to IndexedDB,
 * then triggers recalculation of current form and entries list with new rates.
 * Also closes settings panel and shows success notification.
 * 
 * @async
 * @function saveSettings
 * @returns {Promise<void>} Resolves when settings are saved and UI is updated
 */
async function saveSettings() {
    // Collect current form values into settings object
    const settings = {
        name: 'rates', // Database key identifier
        pointRate: parseFloat(document.getElementById('point-rate').value) || POINT_BASE_RATE,
        kmRate: parseFloat(document.getElementById('km-rate').value) || KM_BASE_RATE,
        perDiemFullRate: parseFloat(document.getElementById('per-diem-full-rate').value) || PER_DIEM_FULL_RATE,
        perDiemPartialRate: parseFloat(document.getElementById('per-diem-partial-rate').value) || PER_DIEM_PARTIAL_RATE,
        includeGST: document.getElementById('gst-enabled').checked
    };
    
    try {
        await window.dbFunctions.saveToDB('settings', settings);
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
        window.uiManager.showNotification('Settings saved');
        window.uiManager.toggleSettings();
    } catch (error) {
        console.error('Error saving settings:', error);
        window.uiManager.showNotification('Error saving settings', true);
    }
}

// Make functions available globally
window.settingsManager = {
    loadSettings,
    saveSettings
};