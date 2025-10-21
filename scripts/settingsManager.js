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
 * Returns default settings object with base rates
 * @returns {Object} Default settings configuration
 */
function getDefaultSettings() {
    return {
        name: 'rates',
        pointRate: POINT_BASE_RATE,
        kmRate: KM_BASE_RATE,
        perDiemFullRate: PER_DIEM_FULL_RATE,
        perDiemPartialRate: PER_DIEM_PARTIAL_RATE,
        includeGST: false,
        techCode: '',
        gstNumber: '',
        businessName: '',
        lastModified: new Date().toISOString()
    };
}

/**
 * Populates the settings form with provided settings data
 * @param {Object} settings - Settings object to populate form with
 */
function populateSettingsForm(settings) {
    if (settings) {
        document.getElementById('point-rate').value = settings.pointRate || POINT_BASE_RATE;
        document.getElementById('km-rate').value = settings.kmRate || KM_BASE_RATE;
        document.getElementById('per-diem-full-rate').value = settings.perDiemFullRate || PER_DIEM_FULL_RATE;
        document.getElementById('per-diem-partial-rate').value = settings.perDiemPartialRate || PER_DIEM_PARTIAL_RATE;
        document.getElementById('gst-enabled').checked = settings.includeGST || false;
        document.getElementById('tech-code').value = settings.techCode || '';
        document.getElementById('gst-number').value = settings.gstNumber || '';
        document.getElementById('business-name').value = settings.businessName || '';
    } else {
        // Use defaults
        const defaults = getDefaultSettings();
        populateSettingsForm(defaults);
    }
    
    // Update per diem display and recalculate earnings
    updatePerDiemLabels();
    if (window.calculations?.calculateEarnings) {
        window.calculations.calculateEarnings();
    }
}

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
        // Check if auth is still initializing
        if (window.authManager?.isInitializing) {
            console.log('⏳ Authentication still initializing, using default settings');
            populateSettingsForm(getDefaultSettings());
            return;
        }
        
        let finalSettings = null;
        
        // Cloud-first approach: try to load from cloud first
        if (window.authManager?.getCurrentUser() && window.authManager?.isEmailVerified()) {
            try {
                const userId = window.authManager.getCurrentUser().uid;
                const cloudSettings = await window.cloudStorage.getSettingsFromCloud(userId);
                
                if (cloudSettings) {
                    console.log('✅ Settings loaded from cloud:', cloudSettings);
                    finalSettings = cloudSettings;
                    
                    // Clear any offline backup since cloud load succeeded
                    await window.dbFunctions.deleteFromDB('offline_settings', 'rates').catch(() => {
                        // Ignore errors if no offline backup exists
                    });
                }
            } catch (cloudError) {
                console.warn('☁️ Could not load settings from cloud, checking offline backup:', cloudError);
                
                // Fallback to offline backup
                try {
                    const offlineSettings = await window.dbFunctions.getFromDB('offline_settings', 'rates');
                    if (offlineSettings) {
                        console.log('💾 Settings loaded from offline backup:', offlineSettings);
                        finalSettings = offlineSettings;
                        window.uiManager.showNotification('📶 Showing offline settings. Connect to internet to sync latest changes.', false, 5000);
                    }
                } catch (offlineError) {
                    console.error('Failed to load offline settings:', offlineError);
                }
            }
        } else {
            // User not authenticated - use defaults silently during initialization
            console.log('User not authenticated, using default settings');
        }
        
        // Populate form fields with final settings or defaults
        populateSettingsForm(finalSettings || getDefaultSettings());
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
    // Validate tech code format before saving
    const techCodeInput = document.getElementById('tech-code').value.trim();
    if (techCodeInput && !/^[A-Za-z]\d{3}$/.test(techCodeInput)) {
        window.uiManager.showNotification('Tech code must be in format C### (letter followed by 3 digits)', true);
        return;
    }

    // Collect current form values into settings object
    const settings = {
        name: 'rates', // Database key identifier
        pointRate: parseFloat(document.getElementById('point-rate').value) || POINT_BASE_RATE,
        kmRate: parseFloat(document.getElementById('km-rate').value) || KM_BASE_RATE,
        perDiemFullRate: parseFloat(document.getElementById('per-diem-full-rate').value) || PER_DIEM_FULL_RATE,
        perDiemPartialRate: parseFloat(document.getElementById('per-diem-partial-rate').value) || PER_DIEM_PARTIAL_RATE,
        includeGST: document.getElementById('gst-enabled').checked,
        techCode: techCodeInput.toUpperCase(),
        gstNumber: document.getElementById('gst-number').value.trim().toUpperCase(),
        businessName: document.getElementById('business-name').value.trim(),
        lastModified: new Date().toISOString() // Add timestamp for conflict resolution
    };
    
    try {
        // Check if user is authenticated and email verified (required for cloud-first)
        if (!window.authManager?.getCurrentUser() || !window.authManager?.isEmailVerified()) {
            throw new Error('User must be signed in and email verified to save settings');
        }

        const userId = window.authManager.getCurrentUser().uid;
        
        // Try to save directly to cloud first
        try {
            await window.cloudStorage.saveSettingsToCloud(userId, settings);
            console.log('✅ Settings saved to cloud');
            
            // Clear any existing offline backup since cloud save succeeded
            await window.dbFunctions.deleteFromDB('offline_settings', 'rates').catch(() => {
                // Ignore errors if no offline backup exists
            });
            
            window.calculations.calculateEarnings();
            window.entryManager.loadEntries();
            window.uiManager.showNotification('Settings saved');
            window.uiManager.toggleSettings();
            
        } catch (cloudError) {
            console.warn('☁️ Cloud save failed, storing locally for offline sync:', cloudError);
            
            // Save to offline backup for later sync
            await window.dbFunctions.saveToDB('offline_settings', settings);
            
            window.calculations.calculateEarnings();
            window.entryManager.loadEntries();
            window.uiManager.showNotification('Could not save to cloud. Settings saved locally and will sync when connection is restored.', false, 5000);
            window.uiManager.toggleSettings();
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        window.uiManager.showNotification('Error saving settings: ' + error.message, true);
    }
}

/**
 * Updates the per diem amounts displayed in radio button labels
 * Reads current rates from settings inputs and updates the bracket amounts
 * Called whenever per diem rates change to keep UI in sync
 * 
 * @function updatePerDiemLabels
 * @returns {void}
 */
function updatePerDiemLabels() {
    const fullRate = parseFloat(document.getElementById('per-diem-full-rate').value) || PER_DIEM_FULL_RATE;
    const partialRate = parseFloat(document.getElementById('per-diem-partial-rate').value) || PER_DIEM_PARTIAL_RATE;
    
    // Update the bracket amounts in radio button labels
    const fullAmount = document.getElementById('full-perdiem-amount');
    const partialAmount = document.getElementById('partial-perdiem-amount');
    
    if (fullAmount) {
        fullAmount.textContent = `($${fullRate.toFixed(0)})`;
    }
    if (partialAmount) {
        partialAmount.textContent = `($${partialRate.toFixed(0)})`;
    }
}

/**
 * Gets the current tech code from settings
 * @async
 * @function getTechCode
 * @returns {Promise<string>} The tech code or empty string if not set
 */
async function getTechCode() {
    try {
        const settings = await window.dbFunctions.getFromDB('settings', 'rates');
        return settings?.techCode || '';
    } catch (error) {
        console.error('Error getting tech code:', error);
        return '';
    }
}

/**
 * Gets the current GST number from settings
 * @async
 * @function getGstNumber
 * @returns {Promise<string>} The GST number or empty string if not set
 */
async function getGstNumber() {
    try {
        const settings = await window.dbFunctions.getFromDB('settings', 'rates');
        return settings?.gstNumber || '';
    } catch (error) {
        console.error('Error getting GST number:', error);
        return '';
    }
}

/**
 * Gets the current tech name from settings
 * @async
 * @function getTechName
 * @returns {Promise<string>} The tech name or empty string if not set
 */
async function getTechName() {
    try {
        const settings = await window.dbFunctions.getFromDB('settings', 'rates');
        return settings?.businessName || '';
    } catch (error) {
        console.error('Error getting tech name:', error);
        return '';
    }
}

/**
 * Syncs settings between local and cloud storage
 * Called by syncManager during full sync operations
 * @async
 * @function syncSettings
 * @returns {Promise<void>}
 */
async function syncSettings() {
    if (!window.authManager?.getCurrentUser()) {
        console.log('No user signed in, skipping settings sync');
        return;
    }
    
    try {
        const userId = window.authManager.getCurrentUser().uid;
        const localSettings = await window.dbFunctions.getFromDB('settings', 'rates');
        const cloudSettings = await window.cloudStorage.getSettingsFromCloud(userId);
        
        if (cloudSettings && localSettings) {
            // Both exist - resolve conflict based on lastModified timestamp
            const localModified = new Date(localSettings.lastModified || 0);
            const cloudModified = new Date(cloudSettings.cloudUpdatedAt || cloudSettings.lastModified || 0);
            
            if (cloudModified > localModified) {
                console.log('📥 Downloading newer settings from cloud');
                const settingsToSave = { ...cloudSettings, name: 'rates' };
                await window.dbFunctions.saveToDB('settings', settingsToSave);
                // Reload settings in UI if settings panel is open
                await loadSettings();
            } else if (localModified > cloudModified) {
                console.log('📤 Uploading newer settings to cloud');
                await window.cloudStorage.saveSettingsToCloud(userId, localSettings);
            } else {
                console.log('⚡ Settings already in sync');
            }
        } else if (cloudSettings && !localSettings) {
            console.log('📥 Downloading settings from cloud (no local settings)');
            const settingsToSave = { ...cloudSettings, name: 'rates' };
            await window.dbFunctions.saveToDB('settings', settingsToSave);
            await loadSettings();
        } else if (localSettings && !cloudSettings) {
            console.log('📤 Uploading settings to cloud (no cloud settings)');
            await window.cloudStorage.saveSettingsToCloud(userId, localSettings);
        }
    } catch (error) {
        console.error('Error syncing settings:', error);
        throw error;
    }
}

/**
 * Forces settings to be uploaded to cloud (for manual sync)
 * @async
 * @function uploadSettingsToCloud
 * @returns {Promise<void>}
 */
async function uploadSettingsToCloud() {
    if (!window.authManager?.getCurrentUser()) {
        return;
    }
    
    try {
        const userId = window.authManager.getCurrentUser().uid;
        const localSettings = await window.dbFunctions.getFromDB('settings', 'rates');
        
        if (localSettings) {
            await window.cloudStorage.saveSettingsToCloud(userId, localSettings);
            console.log('📤 Settings uploaded to cloud');
        }
    } catch (error) {
        console.error('Error uploading settings to cloud:', error);
        throw error;
    }
}

/**
 * Forces settings to be downloaded from cloud (for manual sync)
 * @async
 * @function downloadSettingsFromCloud
 * @returns {Promise<void>}
 */
async function downloadSettingsFromCloud() {
    if (!window.authManager?.getCurrentUser()) {
        return;
    }
    
    try {
        const userId = window.authManager.getCurrentUser().uid;
        const cloudSettings = await window.cloudStorage.getSettingsFromCloud(userId);
        
        if (cloudSettings) {
            const settingsToSave = { ...cloudSettings, name: 'rates' };
            await window.dbFunctions.saveToDB('settings', settingsToSave);
            await loadSettings();
            console.log('📥 Settings downloaded from cloud');
        }
    } catch (error) {
        console.error('Error downloading settings from cloud:', error);
        throw error;
    }
}

/**
 * Compares two settings objects to see if they're different
 * @function settingsAreDifferent
 * @param {Object} settings1 - First settings object
 * @param {Object} settings2 - Second settings object
 * @returns {boolean} True if settings are different
 */
function settingsAreDifferent(settings1, settings2) {
    const compareFields = ['pointRate', 'kmRate', 'perDiemFullRate', 'perDiemPartialRate', 'includeGST', 'techCode', 'gstNumber', 'businessName'];
    
    for (const field of compareFields) {
        if (settings1[field] !== settings2[field]) {
            return true;
        }
    }
    return false;
}

/**
 * Shows a dialog for user to choose between local and cloud settings
 * @async
 * @function showSettingsConflictDialog
 * @param {Object} localSettings - Local settings
 * @param {Object} cloudSettings - Cloud settings
 * @returns {Promise<string>} User choice: 'local', 'cloud', or 'cancel'
 */
async function showSettingsConflictDialog(localSettings, cloudSettings) {
    return new Promise((resolve) => {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'conflict-modal';
        modal.innerHTML = `
            <div class="conflict-modal-overlay"></div>
            <div class="conflict-modal-content">
                <h2>Settings Conflict Detected</h2>
                <p>Your device settings differ from cloud settings. Which would you like to keep?</p>
                
                <div class="conflict-comparison">
                    <div class="conflict-option local">
                        <h4>📱 Device Settings</h4>
                        <div class="settings-details">
                            <p><strong>Point Rate:</strong> $${localSettings.pointRate || 'Default'}</p>
                            <p><strong>KM Rate:</strong> $${localSettings.kmRate || 'Default'}</p>
                            <p><strong>Full Per Diem:</strong> $${localSettings.perDiemFullRate || 'Default'}</p>
                            <p><strong>Partial Per Diem:</strong> $${localSettings.perDiemPartialRate || 'Default'}</p>
                            <p><strong>GST:</strong> ${localSettings.includeGST ? 'Enabled' : 'Disabled'}</p>
                            <p><strong>Tech Code:</strong> ${localSettings.techCode || 'None'}</p>
                            <p><strong>Business Name:</strong> ${localSettings.businessName || 'None'}</p>
                        </div>
                        <label>
                            <input type="radio" name="settings-choice" value="local">
                            Use Device Settings
                        </label>
                    </div>
                    
                    <div class="conflict-option cloud">
                        <h4>☁️ Cloud Settings</h4>
                        <div class="settings-details">
                            <p><strong>Point Rate:</strong> $${cloudSettings.pointRate || 'Default'}</p>
                            <p><strong>KM Rate:</strong> $${cloudSettings.kmRate || 'Default'}</p>
                            <p><strong>Full Per Diem:</strong> $${cloudSettings.perDiemFullRate || 'Default'}</p>
                            <p><strong>Partial Per Diem:</strong> $${cloudSettings.perDiemPartialRate || 'Default'}</p>
                            <p><strong>GST:</strong> ${cloudSettings.includeGST ? 'Enabled' : 'Disabled'}</p>
                            <p><strong>Tech Code:</strong> ${cloudSettings.techCode || 'None'}</p>
                            <p><strong>Business Name:</strong> ${cloudSettings.businessName || 'None'}</p>
                        </div>
                        <label>
                            <input type="radio" name="settings-choice" value="cloud">
                            Use Cloud Settings
                        </label>
                    </div>
                </div>
                
                <div class="conflict-actions">
                    <button id="apply-settings-choice" class="conflict-btn primary" disabled>Apply Choice</button>
                    <button id="cancel-settings-choice" class="conflict-btn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Enable apply button when choice is made
        const radioButtons = modal.querySelectorAll('input[name="settings-choice"]');
        const applyBtn = modal.querySelector('#apply-settings-choice');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                applyBtn.disabled = false;
            });
        });
        
        // Handle apply button
        applyBtn.addEventListener('click', () => {
            const selectedChoice = modal.querySelector('input[name="settings-choice"]:checked');
            const choice = selectedChoice ? selectedChoice.value : 'cancel';
            document.body.removeChild(modal);
            resolve(choice);
        });
        
        // Handle cancel button
        modal.querySelector('#cancel-settings-choice').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve('cancel');
        });
        
        // Handle click outside modal
        modal.querySelector('.conflict-modal-overlay').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve('cancel');
        });
    });
}

/**
 * Handles the sync all data button click
 * Triggers the manual sync all process from syncManager
 * 
 * @async
 * @function handleSyncAllData
 * @returns {Promise<void>} Resolves when sync all process is complete
 */
async function handleSyncAllData() {
    try {
        if (window.syncManager && window.syncManager.performManualSyncAll) {
            await window.syncManager.performManualSyncAll();
        } else {
            window.uiManager.showNotification('Sync not available - please check your connection', true);
        }
    } catch (error) {
        console.error('Error in sync all data:', error);
        window.uiManager.showNotification('Error syncing all data', true);
    }
}

/**
 * Handles the cleanup duplicates button click
 * Triggers the duplicate removal process from entryManager
 * 
 * @async
 * @function handleCleanupDuplicates
 * @returns {Promise<void>} Resolves when cleanup process is complete
 */
async function handleCleanupDuplicates() {
    try {
        const confirmed = confirm('This will remove duplicate entries for the same date, keeping the most recent version of each.\n\nContinue with cleanup?');
        if (!confirmed) {
            return;
        }
        
        const duplicatesRemoved = await window.entryManager.removeDuplicateEntries();
        if (duplicatesRemoved === 0) {
            window.uiManager.showNotification('No duplicate entries found');
        }
    } catch (error) {
        console.error('Error in cleanup duplicates:', error);
        window.uiManager.showNotification('Error cleaning up duplicates', true);
    }
}

// Make functions available globally
window.settingsManager = {
    loadSettings,
    saveSettings,
    updatePerDiemLabels,
    getTechCode,
    getGstNumber,
    getTechName,
    handleSyncAllData,
    handleCleanupDuplicates,
    syncSettings,
    uploadSettingsToCloud,
    downloadSettingsFromCloud,
    settingsAreDifferent,
    showSettingsConflictDialog,
    getDefaultSettings,
    populateSettingsForm
};