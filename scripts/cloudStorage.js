/**
 * Cloud Storage Manager Module
 * Handles all Firestore operations for storing entries and settings in the cloud
 * Provides CRUD operations and real-time synchronization
 */

/**
 * Saves an entry to Firestore using date as document ID
 * @async
 * @function saveEntryToCloud
 * @param {string} userId - User ID
 * @param {Object} entry - Entry object to save
 * @returns {Promise<string>} Date of the saved entry
 */
async function saveEntryToCloud(userId, entry) {
    try {
        // Add timestamp for cloud tracking
        const entryWithMetadata = {
            ...entry,
            cloudUpdatedAt: new Date(),
            cloudCreatedAt: entry.cloudCreatedAt || new Date()
        };
        
        const entryRef = window.firebaseModules.doc(window.firebaseDb, 'users', userId, 'entries', entry.date);
        await window.firebaseModules.setDoc(entryRef, entryWithMetadata);
        
        console.log('☁️ Entry saved to cloud:', entry.date);
        return entry.date;
    } catch (error) {
        console.error('❌ Error saving entry to cloud:', error);
        throw error;
    }
}

/**
 * Updates an entry in Firestore
 * @async
 * @function updateEntryInCloud
 * @param {string} userId - User ID
 * @param {string} date - Entry date (YYYY-MM-DD)
 * @param {Object} entry - Updated entry object
 * @returns {Promise<void>}
 */
async function updateEntryInCloud(userId, date, entry) {
    try {
        const entryWithMetadata = {
            ...entry,
            cloudUpdatedAt: new Date()
        };
        
        const entryRef = window.firebaseModules.doc(window.firebaseDb, 'users', userId, 'entries', date);
        await window.firebaseModules.updateDoc(entryRef, entryWithMetadata);
        
        console.log('☁️ Entry updated in cloud:', date);
    } catch (error) {
        console.error('❌ Error updating entry in cloud:', error);
        throw error;
    }
}

/**
 * Deletes an entry from Firestore
 * @async
 * @function deleteEntryFromCloud
 * @param {string} userId - User ID
 * @param {string} date - Entry date (YYYY-MM-DD)
 * @returns {Promise<void>}
 */
async function deleteEntryFromCloud(userId, date) {
    try {
        const entryRef = window.firebaseModules.doc(window.firebaseDb, 'users', userId, 'entries', date);
        await window.firebaseModules.deleteDoc(entryRef);
        
        console.log('☁️ Entry deleted from cloud:', date);
    } catch (error) {
        console.error('❌ Error deleting entry from cloud:', error);
        throw error;
    }
}

/**
 * Gets all entries for a user from Firestore
 * @async
 * @function getAllEntriesFromCloud
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of entry objects with IDs
 */
async function getAllEntriesFromCloud(userId) {
    try {
        const entriesRef = window.firebaseModules.collection(window.firebaseDb, 'users', userId, 'entries');
        const querySnapshot = await window.firebaseModules.getDocs(entriesRef);
        
        const entries = [];
        querySnapshot.forEach((doc) => {
            entries.push({
                date: doc.id, // Date is the document ID
                ...doc.data()
            });
        });
        
        console.log(`☁️ Retrieved ${entries.length} entries from cloud`);
        return entries;
    } catch (error) {
        console.error('❌ Error getting entries from cloud:', error);
        throw error;
    }
}

/**
 * Gets a specific entry from Firestore
 * @async
 * @function getEntryFromCloud
 * @param {string} userId - User ID
 * @param {string} date - Entry date (YYYY-MM-DD)
 * @returns {Promise<Object|null>} Entry object or null if not found
 */
async function getEntryFromCloud(userId, date) {
    try {
        const entryRef = window.firebaseModules.doc(window.firebaseDb, 'users', userId, 'entries', date);
        const docSnap = await window.firebaseModules.getDoc(entryRef);
        
        if (docSnap.exists()) {
            return {
                date: docSnap.id, // Date is the document ID
                ...docSnap.data()
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('❌ Error getting entry from cloud:', error);
        throw error;
    }
}

/**
 * Saves user settings to Firestore
 * @async
 * @function saveSettingsToCloud
 * @param {string} userId - User ID
 * @param {Object} settings - Settings object to save
 * @returns {Promise<void>}
 */
async function saveSettingsToCloud(userId, settings) {
    try {
        const settingsWithMetadata = {
            ...settings,
            cloudUpdatedAt: new Date()
        };
        
        const settingsRef = window.firebaseModules.doc(window.firebaseDb, 'users', userId, 'settings', 'rates');
        await window.firebaseModules.updateDoc(settingsRef, settingsWithMetadata).catch(async (error) => {
            if (error.code === 'not-found') {
                // Document doesn't exist, create it with specific ID 'rates'
                await window.firebaseModules.setDoc(settingsRef, { ...settingsWithMetadata, name: 'rates' });
            } else {
                throw error;
            }
        });
        
        console.log('☁️ Settings saved to cloud');
    } catch (error) {
        console.error('❌ Error saving settings to cloud:', error);
        throw error;
    }
}

/**
 * Gets user settings from Firestore
 * @async
 * @function getSettingsFromCloud
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Settings object or null if not found
 */
async function getSettingsFromCloud(userId) {
    try {
        const settingsRef = window.firebaseModules.doc(window.firebaseDb, 'users', userId, 'settings', 'rates');
        const docSnap = await window.firebaseModules.getDoc(settingsRef);
        
        if (docSnap.exists()) {
            console.log('☁️ Settings retrieved from cloud');
            return docSnap.data();
        } else {
            console.log('☁️ No settings found in cloud');
            return null;
        }
    } catch (error) {
        console.error('❌ Error getting settings from cloud:', error);
        throw error;
    }
}

/**
 * Sets up real-time listener for entries
 * @function setupEntriesListener
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} Unsubscribe function
 */
function setupEntriesListener(userId, callback) {
    try {
        const entriesRef = window.firebaseModules.collection(window.firebaseDb, 'users', userId, 'entries');
        const q = window.firebaseModules.query(entriesRef, window.firebaseModules.orderBy('date', 'desc'));
        
        return window.firebaseModules.onSnapshot(q, (querySnapshot) => {
            const entries = [];
            querySnapshot.forEach((doc) => {
                entries.push({
                    date: doc.id, // Date is the document ID
                    ...doc.data()
                });
            });
            
            console.log(`🔄 Real-time update: ${entries.length} entries`);
            callback(entries);
        }, (error) => {
            console.error('❌ Error in entries listener:', error);
        });
    } catch (error) {
        console.error('❌ Error setting up entries listener:', error);
        return () => {}; // Return empty unsubscribe function
    }
}

/**
 * Sets up real-time listener for settings
 * @function setupSettingsListener
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} Unsubscribe function
 */
function setupSettingsListener(userId, callback) {
    try {
        const settingsRef = window.firebaseModules.doc(window.firebaseDb, 'users', userId, 'settings', 'rates');
        
        return window.firebaseModules.onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                console.log('🔄 Real-time settings update');
                callback(docSnap.data());
            }
        }, (error) => {
            console.error('❌ Error in settings listener:', error);
        });
    } catch (error) {
        console.error('❌ Error setting up settings listener:', error);
        return () => {}; // Return empty unsubscribe function
    }
}

/**
 * Batch upload multiple entries to Firestore
 * @async
 * @function batchUploadEntries
 * @param {string} userId - User ID
 * @param {Array} entries - Array of entry objects
 * @returns {Promise<Array>} Array of document IDs
 */
async function batchUploadEntries(userId, entries) {
    try {
        console.log(`☁️ Starting batch upload of ${entries.length} entries...`);
        
        const uploadPromises = entries.map(async (entry) => {
            try {
                return await saveEntryToCloud(userId, entry);
            } catch (error) {
                console.error('❌ Failed to upload entry:', entry.date, error);
                return null;
            }
        });
        
        const results = await Promise.all(uploadPromises);
        const successful = results.filter(id => id !== null);
        
        console.log(`✅ Batch upload complete: ${successful.length}/${entries.length} entries uploaded`);
        return successful;
    } catch (error) {
        console.error('❌ Error in batch upload:', error);
        throw error;
    }
}

/**
 * Checks if Firestore is available
 * @function isCloudAvailable
 * @returns {boolean} True if Firestore is available
 */
function isCloudAvailable() {
    return !!(window.firebaseDb && window.firebaseModules);
}

/**
 * Gets the cloud storage status
 * @function getStorageStatus
 * @returns {Object} Status object with availability and user info
 */
function getStorageStatus() {
    return {
        available: isCloudAvailable(),
        authenticated: window.authManager ? window.authManager.isAuthenticated() : false,
        userId: window.authManager ? window.authManager.getUserId() : null
    };
}

// Make functions available globally
window.cloudStorage = {
    saveEntryToCloud,
    updateEntryInCloud,
    deleteEntryFromCloud,
    getAllEntriesFromCloud,
    getEntryFromCloud,
    saveSettingsToCloud,
    getSettingsFromCloud,
    setupEntriesListener,
    setupSettingsListener,
    batchUploadEntries,
    isCloudAvailable,
    getStorageStatus
};