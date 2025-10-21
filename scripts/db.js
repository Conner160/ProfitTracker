/**
 * Database Module
 * Manages IndexedDB operations for persistent storage of daily entries
 * and user settings. Provides Promise-based API for create, read, update,
 * and delete operations on the ProfitTracker database.
 */

// Database configuration constants
const DB_NAME = 'ProfitTrackerDB';  // IndexedDB database name
const DB_VERSION = 3;               // Database schema version - updated for cloud-first with offline queues
let db;                            // Global database connection reference

/**
 * Initializes the IndexedDB database with required object stores
 * Creates 'entries' store for daily entry data and 'settings' store for
 * user preferences. Sets up indexes and handles database upgrades.
 * Must be called before any other database operations.
 * 
 * @async
 * @function initDB
 * @returns {Promise<void>} Resolves when database is ready for use
 * @throws {string} Rejects with error message if IndexedDB not supported
 */
function initDB() {
    return new Promise((resolve, reject) => {
        // Check for IndexedDB browser support
        if (!window.indexedDB) {
            reject('IndexedDB not supported');
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database initialized');
            resolve();
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Legacy entries store (kept for migration purposes, but not used in cloud-first mode)
            if (!db.objectStoreNames.contains('entries')) {
                const entriesStore = db.createObjectStore('entries', { keyPath: 'date' });
            }
            
            // Legacy settings store (kept for migration purposes, but not used in cloud-first mode)
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'name' });
            }
            
            // Offline queue for entries that failed to sync to cloud
            if (!db.objectStoreNames.contains('offline_entries')) {
                const offlineEntriesStore = db.createObjectStore('offline_entries', { keyPath: 'date' });
                offlineEntriesStore.createIndex('offlineAction', 'offlineAction', { unique: false });
                offlineEntriesStore.createIndex('offlineTimestamp', 'offlineTimestamp', { unique: false });
            }
            
            // Offline queue for settings that failed to sync to cloud
            if (!db.objectStoreNames.contains('offline_settings')) {
                const offlineSettingsStore = db.createObjectStore('offline_settings', { keyPath: 'name' });
                offlineSettingsStore.createIndex('offlineTimestamp', 'offlineTimestamp', { unique: false });
            }
        };
    });
}

/**
 * Saves data to specified database store using upsert operation
 * Uses IndexedDB put() method which inserts new records or updates
 * existing records based on the primary key. Handles both daily
 * entries and settings storage.
 * 
 * @async
 * @function saveToDB
 * @param {string} storeName - Name of the object store ('entries' or 'settings')
 * @param {Object} data - Data object to save (must include appropriate key field)
 * @returns {Promise<void>} Resolves when save operation completes
 * @throws {Error} Rejects with database error if save fails
 */
function saveToDB(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.put(data);
        
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Retrieves a single record from database by primary key
 * Performs indexed lookup for fast retrieval of specific entries
 * or settings records.
 * 
 * @async
 * @function getFromDB
 * @param {string} storeName - Name of the object store to query
 * @param {string|number} key - Primary key value to retrieve
 * @returns {Promise<Object|undefined>} Resolves with found record or undefined
 * @throws {Error} Rejects with database error if query fails
 */
function getFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Retrieves all records from the specified database store
 * Performs full table scan to return every record in the store.
 * Used for loading complete entry lists and bulk operations.
 * 
 * @async
 * @function getAllFromDB
 * @param {string} storeName - Name of the object store to query
 * @returns {Promise<Array<Object>>} Resolves with array of all records in store
 * @throws {Error} Rejects with database error if query fails
 */
function getAllFromDB(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Deletes a single record from database by primary key
 * Permanently removes the specified record from the database store.
 * Used for entry deletion and settings cleanup.
 * 
 * @async
 * @function deleteFromDB
 * @param {string} storeName - Name of the object store to modify
 * @param {string|number} key - Primary key of record to delete
 * @returns {Promise<void>} Resolves when deletion completes
 * @throws {Error} Rejects with database error if deletion fails
 */
function deleteFromDB(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Clear all entries from the database
 * Used during cloud sync to replace local data with cloud data
 * 
 * @async
 * @function clearAllEntries
 * @returns {Promise<void>} Resolves when all entries are deleted
 */
function clearAllEntries() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');
        
        const request = store.clear();
        
        request.onsuccess = () => {
            console.log('All entries cleared from local database');
            resolve();
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Update an existing entry by date
 * Used during sync to update local entries with cloud data
 * 
 * @async
 * @function updateEntry
 * @param {string} date - The date of the entry to update (YYYY-MM-DD)
 * @param {Object} entryData - The updated entry data
 * @returns {Promise<void>} Resolves when entry is updated
 */
function updateEntry(date, entryData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');
        
        // Ensure the entry has the correct date as primary key
        entryData.date = date;
        entryData.lastModified = new Date().toISOString();
        
        const request = store.put(entryData);
        
        request.onsuccess = () => {
            console.log('Entry updated:', date);
            resolve();
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Gets all items from the offline queue that need to be synced
 * @param {string} storeName - The offline store name ('offline_entries' or 'offline_settings')
 * @returns {Promise<Array>} Array of items waiting to be synced
 */
function getOfflineQueue(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const items = request.result || [];
            console.log(`Retrieved ${items.length} items from ${storeName}`);
            resolve(items);
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Clears all items from an offline queue store
 * @param {string} storeName - The offline store name to clear
 * @returns {Promise<void>} Resolves when queue is cleared
 */
function clearOfflineQueue(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
            console.log(`Cleared offline queue: ${storeName}`);
            resolve();
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Gets the count of items in an offline queue
 * @param {string} storeName - The offline store name to count
 * @returns {Promise<number>} Number of items in the queue
 */
function getOfflineQueueCount(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Make functions available globally
window.dbFunctions = {
    initDB,
    saveToDB,
    getFromDB,
    getAllFromDB,
    deleteFromDB,
    clearAllEntries,
    updateEntry,
    getOfflineQueue,
    clearOfflineQueue,
    getOfflineQueueCount
};
