/**
 * Migration Manager Module
 * Handles one-time migration from old local storage to cloud-first architecture
 * Ensures clean transition and prevents data conflicts with user choice for conflicts
 */

/**
 * Shows a dialog to resolve conflicts between local and cloud entries
 * @param {Object} localEntry - The local entry data
 * @param {Object} cloudEntry - The cloud entry data
 * @returns {Promise<boolean>} True if user wants to keep local, false for cloud
 */
async function showConflictResolutionDialog(localEntry, cloudEntry) {
    return new Promise((resolve) => {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;
        
        const formatEntryData = (entry) => {
            const expenses = entry.expenses || {};
            const totalExpenses = (expenses.hotel || 0) + (expenses.gas || 0) + (expenses.food || 0);
            return `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 8px 0;">
                    <div style="font-weight: bold; margin-bottom: 8px;">${window.dateUtils?.formatDateForDisplay(entry.date) || entry.date}</div>
                    <div>Points: ${entry.points || 0}</div>
                    <div>KMs: ${entry.kms || 0}</div>
                    <div>Per Diem: ${entry.perDiem || 'none'}</div>
                    <div>Total Expenses: $${totalExpenses.toFixed(2)}</div>
                    ${entry.notes ? `<div>Notes: ${entry.notes}</div>` : ''}
                    ${entry.landLocations?.length ? `<div>Locations: ${entry.landLocations.join(', ')}</div>` : ''}
                </div>
            `;
        };
        
        dialog.innerHTML = `
            <h2 style="margin-top: 0; color: #333;">Data Conflict Found</h2>
            <p style="color: #666; margin-bottom: 20px;">
                You have different data for <strong>${window.dateUtils?.formatDateForDisplay(localEntry.date) || localEntry.date}</strong> 
                in your local storage and cloud storage. Which would you like to keep?
            </p>
            
            <div style="display: flex; gap: 20px; margin: 20px 0;">
                <div style="flex: 1;">
                    <h3 style="color: #2196F3; margin-bottom: 10px;">📱 Local Data</h3>
                    ${formatEntryData(localEntry)}
                </div>
                <div style="flex: 1;">
                    <h3 style="color: #4CAF50; margin-bottom: 10px;">☁️ Cloud Data</h3>
                    ${formatEntryData(cloudEntry)}
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                <button id="keep-cloud" style="
                    padding: 12px 24px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">Keep Cloud Data</button>
                <button id="keep-local" style="
                    padding: 12px 24px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">Keep Local Data</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Handle button clicks
        dialog.querySelector('#keep-local').onclick = () => {
            document.body.removeChild(modal);
            resolve(true);
        };
        
        dialog.querySelector('#keep-cloud').onclick = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
    });
}

/**
 * Shows a dialog to resolve conflicts between local and cloud settings
 * @param {Object} localSettings - The local settings data
 * @param {Object} cloudSettings - The cloud settings data
 * @returns {Promise<boolean>} True if user wants to keep local, false for cloud
 */
async function showSettingsConflictDialog(localSettings, cloudSettings) {
    return new Promise((resolve) => {
        const confirmed = confirm(
            `Settings Conflict Found\n\n` +
            `You have different rate settings in local storage vs cloud storage.\n\n` +
            `Local: $${localSettings.pointRate}/pt, $${localSettings.kmRate}/km\n` +
            `Cloud: $${cloudSettings.pointRate}/pt, $${cloudSettings.kmRate}/km\n\n` +
            `Click OK to keep LOCAL settings, Cancel to keep CLOUD settings.`
        );
        resolve(confirmed);
    });
}

/**
 * Migrates data from old local storage to cloud-first architecture
 * Preserves existing local data by uploading it to cloud before clearing local storage
 */
async function migrateToCloudFirst() {
    try {
        console.log('🔄 Starting migration to cloud-first architecture...');
        
        // Check if migration has already been completed
        const migrationComplete = localStorage.getItem('cloudFirstMigrationComplete');
        if (migrationComplete === 'true') {
            console.log('✅ Migration already completed, skipping...');
            return;
        }
        
        // Ensure user is authenticated before migrating data
        if (!window.authManager?.getCurrentUser() || !window.authManager?.isEmailVerified()) {
            console.log('⚠️ User not authenticated, skipping data migration');
            return;
        }
        
        const userId = window.authManager.getCurrentUser().uid;
        let migratedEntries = 0;
        let migratedSettings = false;
        
        // Migrate old entries to cloud
        try {
            const oldEntries = await window.dbFunctions.getAllFromDB('entries').catch(() => []);
            
            if (oldEntries.length > 0) {
                console.log(`� Migrating ${oldEntries.length} local entries to cloud...`);
                
                // Upload each entry to cloud
                for (const entry of oldEntries) {
                    try {
                        // Remove the local ID since cloud will generate new ones
                        const cloudEntry = { ...entry };
                        delete cloudEntry.id;
                        
                        await window.cloudStorage.saveEntryToCloud(userId, cloudEntry);
                        migratedEntries++;
                        
                        // Delete from old local storage after successful cloud upload
                        await window.dbFunctions.deleteFromDB('entries', entry.id);
                        
                    } catch (entryError) {
                        console.error(`Failed to migrate entry for ${entry.date}:`, entryError);
                        // Continue with other entries even if one fails
                    }
                }
                
                console.log(`✅ Successfully migrated ${migratedEntries} entries to cloud`);
            }
            
        } catch (error) {
            console.warn('⚠️ Could not migrate entries:', error);
        }
        
        // Migrate settings with conflict resolution
        try {
            const oldSettings = await window.dbFunctions.getFromDB('settings', 'rates').catch(() => null);
            
            if (oldSettings) {
                console.log('📤 Migrating local settings to cloud...');
                
                // Check if cloud settings exist
                let cloudSettings = null;
                try {
                    cloudSettings = await window.cloudStorage.getSettingsFromCloud(userId);
                } catch (error) {
                    // No cloud settings exist
                }
                
                if (cloudSettings) {
                    // Ask user which settings to keep
                    const keepLocal = await showSettingsConflictDialog(oldSettings, cloudSettings);
                    
                    if (keepLocal) {
                        await window.cloudStorage.saveSettingsToCloud(userId, oldSettings);
                        console.log('✅ Updated cloud settings with local settings');
                    } else {
                        console.log('⏭️ Kept existing cloud settings');
                    }
                } else {
                    // No cloud settings - automatically save local
                    await window.cloudStorage.saveSettingsToCloud(userId, oldSettings);
                    console.log('✅ Saved local settings to cloud');
                }
                
                // Delete from old local storage
                await window.dbFunctions.deleteFromDB('settings', 'rates');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not migrate settings:', error);
        }
        
        // Mark migration as complete
        localStorage.setItem('cloudFirstMigrationComplete', 'true');
        console.log('✅ Migration to cloud-first architecture completed');
        
        // Show notification to user about what was migrated
        if (window.uiManager && window.uiManager.showNotification) {
            if (migratedEntries > 0) {
                let message = `📡 Migration complete: ${migratedEntries} entries added to cloud`;
                if (conflictedEntries > 0) {
                    message += `, ${conflictedEntries} conflicts resolved`;
                }
                window.uiManager.showNotification(message, false, 6000);
            } else {
                window.uiManager.showNotification('📡 Switched to cloud-first storage successfully!', false, 3000);
            }
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        
        // Show error notification but don't block app
        if (window.uiManager && window.uiManager.showNotification) {
            window.uiManager.showNotification('⚠️ Some data migration failed. Contact support if you\'re missing data.', true, 8000);
        }
    }
}

/**
 * Checks for old local data and provides user choice for migration
 * Called during app initialization to handle existing users gracefully
 */
async function checkForOldData() {
    try {
        // Only check if user is authenticated
        if (!window.authManager?.getCurrentUser() || !window.authManager?.isEmailVerified()) {
            return;
        }
        
        const migrationComplete = localStorage.getItem('cloudFirstMigrationComplete');
        if (migrationComplete === 'true') {
            return; // Already migrated
        }
        
        const oldEntries = await window.dbFunctions.getAllFromDB('entries').catch(() => []);
        const oldSettings = await window.dbFunctions.getFromDB('settings', 'rates').catch(() => null);
        
        if (oldEntries.length > 0 || oldSettings) {
            console.log(`📋 Found existing local data: ${oldEntries.length} entries${oldSettings ? ' and settings' : ''}`);
            
            // Auto-migrate data to preserve it
            await migrateToCloudFirst();
        } else {
            // No old data, just mark migration complete
            localStorage.setItem('cloudFirstMigrationComplete', 'true');
        }
    } catch (error) {
        console.warn('Could not check for old data:', error);
    }
}

// Make functions available globally
window.migrationManager = {
    migrateToCloudFirst,
    checkForOldData
};