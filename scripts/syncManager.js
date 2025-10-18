/**
 * Sync Manager - Coordinates between local IndexedDB and Firestore cloud storage
 */

class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.isOnline = navigator.onLine;
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || null;
        this.syncConflicts = [];
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatusUI();
            this.syncWhenOnline();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatusUI();
        });
        
        // Listen for auth state changes
        window.authManager?.onAuthStateChanged(this.handleAuthStateChange.bind(this));
    }

    async handleAuthStateChange(user) {
        if (user) {
            console.log('User signed in, starting sync...');
            await this.performFullSync();
        } else {
            console.log('User signed out');
            this.lastSyncTime = null;
            localStorage.removeItem('lastSyncTime');
        }
    }

    async syncWhenOnline() {
        if (this.isOnline && window.authManager?.getCurrentUser()) {
            await this.performSync();
        }
    }

    async performFullSync() {
        if (this.isSyncing) return;
        
        try {
            this.isSyncing = true;
            this.updateSyncStatusUI();
            console.log('Starting full sync...');
            
            // Get local and cloud data
            const localEntries = await window.db.getAllEntries();
            const cloudEntries = await window.cloudStorage.getAllEntriesFromCloud();
            
            console.log(`Local entries: ${localEntries.length}, Cloud entries: ${cloudEntries.length}`);
            
            // If this is the first sync (no cloud data), upload all local data
            if (cloudEntries.length === 0 && localEntries.length > 0) {
                console.log('First sync: uploading all local data to cloud...');
                await this.uploadAllLocalData(localEntries);
                this.updateLastSyncTime();
                return;
            }
            
            // If user has cloud data but no local data, download everything
            if (localEntries.length === 0 && cloudEntries.length > 0) {
                console.log('Downloading all cloud data to local storage...');
                await this.downloadAllCloudData(cloudEntries);
                this.updateLastSyncTime();
                return;
            }
            
            // Perform two-way sync
            await this.performTwoWaySync(localEntries, cloudEntries);
            this.updateLastSyncTime();
            
        } catch (error) {
            console.error('Full sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
            this.updateSyncStatusUI();
        }
    }

    async performSync() {
        if (this.isSyncing || !this.isOnline) return;
        
        try {
            this.isSyncing = true;
            
            // Get entries modified since last sync
            const lastSync = this.lastSyncTime ? new Date(this.lastSyncTime) : null;
            const localEntries = await window.db.getAllEntries();
            const modifiedLocalEntries = lastSync 
                ? localEntries.filter(entry => new Date(entry.lastModified || entry.date) > lastSync)
                : localEntries;
            
            // Upload modified local entries
            if (modifiedLocalEntries.length > 0) {
                console.log(`Uploading ${modifiedLocalEntries.length} modified local entries...`);
                for (const entry of modifiedLocalEntries) {
                    await window.cloudStorage.saveEntryToCloud(entry);
                }
            }
            
            // Download any cloud updates (handled by real-time listener)
            this.updateLastSyncTime();
            
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.isSyncing = false;
            this.updateSyncStatusUI();
        }
    }

    async uploadAllLocalData(localEntries) {
        try {
            // Upload in batches to avoid overwhelming the server
            await window.cloudStorage.batchUploadEntries(localEntries);
            console.log(`Successfully uploaded ${localEntries.length} entries to cloud`);
        } catch (error) {
            console.error('Failed to upload local data:', error);
            throw error;
        }
    }

    async downloadAllCloudData(cloudEntries) {
        try {
            // Clear local database first
            await window.db.clearAllEntries();
            
            // Add all cloud entries to local database
            for (const entry of cloudEntries) {
                // Ensure entry has required local fields
                if (!entry.id) {
                    entry.id = this.generateLocalId();
                }
                await window.db.addEntry(entry);
            }
            
            console.log(`Successfully downloaded ${cloudEntries.length} entries from cloud`);
            
            // Refresh UI
            if (window.entryManager) {
                window.entryManager.displayEntries();
            }
        } catch (error) {
            console.error('Failed to download cloud data:', error);
            throw error;
        }
    }

    async performTwoWaySync(localEntries, cloudEntries) {
        console.log('Performing two-way sync...');
        
        // Create maps for easier lookup
        const localMap = new Map(localEntries.map(entry => [entry.id, entry]));
        const cloudMap = new Map(cloudEntries.map(entry => [entry.id, entry]));
        
        const entriesToUpload = [];
        const entriesToDownload = [];
        const conflicts = [];
        
        // Check local entries
        for (const localEntry of localEntries) {
            const cloudEntry = cloudMap.get(localEntry.id);
            
            if (!cloudEntry) {
                // Local entry doesn't exist in cloud - upload it
                entriesToUpload.push(localEntry);
            } else {
                // Entry exists in both - check for conflicts
                const localModified = new Date(localEntry.lastModified || localEntry.date);
                const cloudModified = new Date(cloudEntry.lastModified || cloudEntry.date);
                
                if (localModified > cloudModified) {
                    // Local is newer - upload it
                    entriesToUpload.push(localEntry);
                } else if (cloudModified > localModified) {
                    // Cloud is newer - download it
                    entriesToDownload.push(cloudEntry);
                } else if (this.entriesAreDifferent(localEntry, cloudEntry)) {
                    // Same timestamp but different content - conflict
                    conflicts.push({ local: localEntry, cloud: cloudEntry });
                }
            }
        }
        
        // Check for cloud entries not in local
        for (const cloudEntry of cloudEntries) {
            if (!localMap.has(cloudEntry.id)) {
                entriesToDownload.push(cloudEntry);
            }
        }
        
        // Handle conflicts (for now, prefer cloud version)
        for (const conflict of conflicts) {
            console.warn('Sync conflict detected for entry:', conflict.local.id);
            entriesToDownload.push(conflict.cloud);
        }
        
        // Upload local changes
        if (entriesToUpload.length > 0) {
            console.log(`Uploading ${entriesToUpload.length} local changes...`);
            for (const entry of entriesToUpload) {
                await window.cloudStorage.saveEntryToCloud(entry);
            }
        }
        
        // Download cloud changes
        if (entriesToDownload.length > 0) {
            console.log(`Downloading ${entriesToDownload.length} cloud changes...`);
            for (const entry of entriesToDownload) {
                await window.db.updateEntry(entry.id, entry);
            }
        }
        
        // Refresh UI if there were changes
        if (entriesToDownload.length > 0 && window.entryManager) {
            window.entryManager.displayEntries();
        }
    }

    entriesAreDifferent(entry1, entry2) {
        // Compare key fields to detect differences
        const fields = ['date', 'location', 'mileage', 'fuelCost', 'lodging', 'meals', 'other', 'notes'];
        
        for (const field of fields) {
            if (entry1[field] !== entry2[field]) {
                return true;
            }
        }
        
        return false;
    }

    generateLocalId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    updateLastSyncTime() {
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem('lastSyncTime', this.lastSyncTime);
        console.log('Last sync time updated:', this.lastSyncTime);
        this.updateSyncStatusUI();
    }

    updateSyncStatusUI() {
        if (window.uiManager?.updateSyncStatus) {
            window.uiManager.updateSyncStatus(this.getSyncStatus());
        }
    }

    async forceTwoWaySync() {
        console.log('Forcing two-way sync...');
        this.lastSyncTime = null;
        localStorage.removeItem('lastSyncTime');
        await this.performFullSync();
    }

    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            isOnline: this.isOnline,
            lastSyncTime: this.lastSyncTime,
            isSignedIn: !!window.authManager?.getCurrentUser(),
            hasConflicts: this.syncConflicts.length > 0
        };
    }
}

// Initialize sync manager
window.syncManager = new SyncManager();