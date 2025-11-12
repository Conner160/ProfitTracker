/**
 * Local DB shim (disabled)
 *
 * The application has been configured to not persist any user data locally.
 * This file provides a minimal API with no-ops so existing modules don't
 * throw errors when they call dbFunctions. All operations are effectively
 * disabled and return resolved promises or empty results.
 */

function initDB() {
    return new Promise((resolve) => {
        console.warn('Local IndexedDB disabled: initDB is a no-op');
        resolve();
    });
}

function saveToDB(storeName, data) {
    console.warn(`Local storage disabled: saveToDB(${storeName}) ignored`);
    return Promise.resolve();
}

function getFromDB(storeName, key) {
    console.warn(`Local storage disabled: getFromDB(${storeName}, ${key}) -> null`);
    return Promise.resolve(null);
}

function getAllFromDB(storeName) {
    console.warn(`Local storage disabled: getAllFromDB(${storeName}) -> []`);
    return Promise.resolve([]);
}

function deleteFromDB(storeName, key) {
    console.warn(`Local storage disabled: deleteFromDB(${storeName}, ${key}) ignored`);
    return Promise.resolve();
}

function clearAllEntries() {
    console.warn('Local storage disabled: clearAllEntries ignored');
    return Promise.resolve();
}

function updateEntry(date, entryData) {
    console.warn(`Local storage disabled: updateEntry(${date}) ignored`);
    return Promise.resolve();
}

function getOfflineQueue(storeName) {
    console.warn(`Local storage disabled: getOfflineQueue(${storeName}) -> []`);
    return Promise.resolve([]);
}

function clearOfflineQueue(storeName) {
    console.warn(`Local storage disabled: clearOfflineQueue(${storeName}) ignored`);
    return Promise.resolve();
}

function getOfflineQueueCount(storeName) {
    console.warn(`Local storage disabled: getOfflineQueueCount(${storeName}) -> 0`);
    return Promise.resolve(0);
}

// Export no-op API
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
