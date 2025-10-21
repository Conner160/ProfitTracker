/**
 * Sync Manager - Coordinates between local IndexedDB and Firestore cloud storage
 */

class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.isOnline = navigator.onLine;
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || null;
        this.syncConflicts = [];
        this.hasPermissionError = false;
        
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
    }

    async onUserSignIn(user) {
        console.log('User signed in, checking verification status...');
        
        // Check if required dependencies are available
        if (!window.cloudStorage || !window.dbFunctions) {
            console.log('Sync dependencies not available, skipping sync');
            return;
        }
        
        // Check if email is verified
        if (!user.emailVerified) {
            console.log('Email not verified, sync disabled');
            window.uiManager?.showNotification('Please verify your email address to enable cloud sync', true);
            return;
        }
        
        console.log('Email verified, starting sync...');
        
        try {
            // Load settings first to ensure rates are up to date
            if (window.settingsManager?.loadSettings) {
                await window.settingsManager.loadSettings();
            }
            
            await this.performFullSync();
        } catch (error) {
            console.log('Sync failed, continuing in local-only mode:', error.message);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                this.showPermissionError();
            }
        }
    }

    async onUserSignOut() {
        console.log('User signed out');
        this.lastSyncTime = null;
        localStorage.removeItem('lastSyncTime');
        this.updateSyncStatusUI();
    }

    async syncWhenOnline() {
        if (this.isOnline && window.authManager?.getCurrentUser() && !this.hasPermissionError) {
            await this.performSync();
        }
    }

    async performFullSync() {
        if (this.isSyncing) return;
        
        try {
            this.isSyncing = true;
            this.updateSyncStatusUI();
            console.log('Starting full sync...');
            
            // Check authentication and email verification
            const userId = window.authManager?.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }
            
            if (!window.authManager?.isEmailVerified()) {
                throw new Error('Email not verified - sync disabled');
            }
            
            const allLocalEntries = await window.dbFunctions.getAllFromDB('entries');
            const allCloudEntries = await window.cloudStorage.getAllEntriesFromCloud(userId);
            
            // Filter to only recent entries (last 2 months) for automatic sync
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            
            const localEntries = allLocalEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= twoMonthsAgo;
            });
            
            const cloudEntries = allCloudEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= twoMonthsAgo;
            });
            
            console.log(`Local entries: ${localEntries.length}, Cloud entries: ${cloudEntries.length}`);
            
            // If this is the first sync (no cloud data), upload all local data
            if (cloudEntries.length === 0 && localEntries.length > 0) {
                console.log('First sync: uploading all local data to cloud...');
                await this.uploadAllLocalData(localEntries);
                
                // Also upload settings on first sync
                if (window.settingsManager?.uploadSettingsToCloud) {
                    await window.settingsManager.uploadSettingsToCloud();
                }
                
                this.updateLastSyncTime();
                return;
            }
            
            // If user has cloud data but no local data, download everything
            if (localEntries.length === 0 && cloudEntries.length > 0) {
                console.log('Downloading all cloud data to local storage...');
                await this.downloadAllCloudData(cloudEntries);
                
                // Also download settings
                if (window.settingsManager?.downloadSettingsFromCloud) {
                    await window.settingsManager.downloadSettingsFromCloud();
                }
                
                this.updateLastSyncTime();
                return;
            }
            
            // Perform two-way sync
            await this.performTwoWaySync(localEntries, cloudEntries);
            
            // Sync settings after entries
            if (window.settingsManager?.syncSettings) {
                await window.settingsManager.syncSettings();
            }
            
            this.updateLastSyncTime();
            
        } catch (error) {
            console.error('Full sync failed:', error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                console.log('📊 Cloud access denied - continuing with local data only');
                this.showPermissionError();
                return; // Don't throw, just continue locally
            }
            throw error;
        } finally {
            this.isSyncing = false;
            this.updateSyncStatusUI();
        }
    }

    async performSync() {
        if (this.isSyncing || !this.isOnline || this.hasPermissionError) return;
        
        // Check email verification before syncing
        if (!window.authManager?.isEmailVerified()) {
            console.log('Email not verified, skipping sync');
            return;
        }
        
        try {
            this.isSyncing = true;
            
            // Get entries modified since last sync (only last 2 months)
            const lastSync = this.lastSyncTime ? new Date(this.lastSyncTime) : null;
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            
            const localEntries = await window.dbFunctions.getAllFromDB('entries');
            
            // Filter entries: only sync recent entries (last 2 months) or recently modified
            const modifiedLocalEntries = localEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                const modifiedDate = new Date(entry.lastModified || entry.createdAt || entry.date);
                
                // Include if entry date is within 2 months OR if recently modified
                const isRecentEntry = entryDate >= twoMonthsAgo;
                const isRecentlyModified = lastSync ? modifiedDate > lastSync : false;
                
                return isRecentEntry || isRecentlyModified;
            });
            
            // Upload modified local entries
            if (modifiedLocalEntries.length > 0) {
                console.log(`Uploading ${modifiedLocalEntries.length} modified local entries...`);
                for (const entry of modifiedLocalEntries) {
                    const userId = window.authManager?.getUserId();
                    await window.cloudStorage.saveEntryToCloud(userId, entry);
                }
            }
            
            // Sync settings as well during regular sync
            if (window.settingsManager?.syncSettings) {
                await window.settingsManager.syncSettings();
            }
            
            // Download any cloud updates (handled by real-time listener)
            this.updateLastSyncTime();
            
        } catch (error) {
            console.error('Sync failed:', error);
            if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
                console.log('🔒 Cloud access denied - switching to local-only mode');
                this.showPermissionError();
            }
        } finally {
            this.isSyncing = false;
            this.updateSyncStatusUI();
        }
    }

    async uploadAllLocalData(localEntries) {
        try {
            // Upload in batches to avoid overwhelming the server
            const userId = window.authManager?.getUserId();
            await window.cloudStorage.batchUploadEntries(userId, localEntries);
            console.log(`Successfully uploaded ${localEntries.length} entries to cloud`);
        } catch (error) {
            console.error('Failed to upload local data:', error);
            throw error;
        }
    }

    async downloadAllCloudData(cloudEntries) {
        try {
            // Clear local database first
            await window.dbFunctions.clearAllEntries();
            
            // Add all cloud entries to local database
            for (const entry of cloudEntries) {
                // Ensure entry has date as primary key
                if (entry.date) {
                    await window.dbFunctions.saveToDB('entries', entry);
                } else {
                    console.warn('Skipping entry without date:', entry);
                }
            }
            
            console.log(`Successfully downloaded ${cloudEntries.length} entries from cloud`);
            
            // Refresh UI
            if (window.entryManager) {
                window.entryManager.loadEntries();
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
        
        // Handle conflicts with user choice
        if (conflicts.length > 0) {
            console.log(`Detected ${conflicts.length} sync conflicts`);
            const resolution = await this.showConflictResolutionDialog(conflicts);
            this.applyConflictResolution(conflicts, resolution, entriesToUpload, entriesToDownload);
        }
        
        // Upload local changes
        if (entriesToUpload.length > 0) {
            console.log(`Uploading ${entriesToUpload.length} local changes...`);
            const userId = window.authManager?.getUserId();
            for (const entry of entriesToUpload) {
                await window.cloudStorage.saveEntryToCloud(userId, entry);
            }
        }
        
        // Download cloud changes
        if (entriesToDownload.length > 0) {
            console.log(`Downloading ${entriesToDownload.length} cloud changes...`);
            for (const entry of entriesToDownload) {
                await window.dbFunctions.updateEntry(entry.id, entry);
            }
        }
        
        // Refresh UI if there were changes
        if (entriesToDownload.length > 0 && window.entryManager) {
            window.entryManager.loadEntries();
        }
    }

    entriesAreDifferent(entry1, entry2) {
        // Compare key fields to detect differences
        const fields = ['date', 'points', 'kms', 'perDiem', 'hotelExpense', 'gasExpense', 'foodExpense', 'landLocations', 'notes'];
        
        for (const field of fields) {
            // Handle array fields (landLocations) specially
            if (Array.isArray(entry1[field]) && Array.isArray(entry2[field])) {
                if (JSON.stringify(entry1[field]) !== JSON.stringify(entry2[field])) {
                    return true;
                }
            } else if (entry1[field] !== entry2[field]) {
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

    async showConflictResolutionDialog(conflicts) {
        return new Promise((resolve) => {
            // Create conflict resolution modal
            const modal = this.createConflictModal(conflicts, resolve);
            document.body.appendChild(modal);
        });
    }

    createConflictModal(conflicts, resolve) {
        const modal = document.createElement('div');
        modal.className = 'conflict-modal';
        modal.innerHTML = `
            <div class="conflict-modal-content">
                <h2>🔄 Sync Conflicts Detected</h2>
                <p>Found ${conflicts.length} conflicting entries between your device and cloud storage.</p>
                
                <div class="conflict-options">
                    <button id="overwrite-cloud" class="conflict-btn primary">📤 Overwrite Cloud (Keep Device Data)</button>
                    <button id="overwrite-device" class="conflict-btn">📥 Overwrite Device (Keep Cloud Data)</button>
                    <button id="choose-each" class="conflict-btn">🔍 Choose for Each Entry</button>
                </div>
                
                <div id="individual-conflicts" style="display: none;">
                    ${conflicts.map((conflict, index) => this.createConflictComparisonHTML(conflict, index)).join('')}
                    <div class="conflict-actions">
                        <button id="apply-choices" class="conflict-btn primary">Apply Choices</button>
                        <button id="cancel-sync" class="conflict-btn">Cancel Sync</button>
                    </div>
                </div>
            </div>
            <div class="conflict-modal-overlay"></div>
        `;

        // Add event listeners
        this.setupConflictModalListeners(modal, conflicts, resolve);
        
        return modal;
    }

    createConflictComparisonHTML(conflict, index) {
        const local = conflict.local;
        const cloud = conflict.cloud;
        
        const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleString();
        };
        
        return `
            <div class="conflict-entry" data-index="${index}">
                <h3>Entry for ${local.date}</h3>
                <div class="conflict-comparison">
                    <div class="conflict-option local">
                        <h4>📱 Device Version</h4>
                        <div class="entry-details">
                            <p><strong>Last Modified:</strong> ${formatDate(local.lastModified || local.createdAt)}</p>
                            <p><strong>Points:</strong> ${local.points || 0}</p>
                            <p><strong>Kilometers:</strong> ${local.kms || 0}</p>
                            <p><strong>Per Diem:</strong> ${local.perDiem || 'none'}</p>
                            <p><strong>Expenses:</strong> Hotel: $${local.hotelExpense || 0}, Gas: $${local.gasExpense || 0}, Food: $${local.foodExpense || 0}</p>
                            <p><strong>Locations:</strong> ${(local.locations || []).join(', ') || 'None'}</p>
                            <p><strong>Notes:</strong> ${local.notes || 'None'}</p>
                        </div>
                        <label><input type="radio" name="conflict-${index}" value="local" checked> Keep Device Version</label>
                    </div>
                    <div class="conflict-option cloud">
                        <h4>☁️ Cloud Version</h4>
                        <div class="entry-details">
                            <p><strong>Last Modified:</strong> ${formatDate(cloud.lastModified || cloud.createdAt)}</p>
                            <p><strong>Points:</strong> ${cloud.points || 0}</p>
                            <p><strong>Kilometers:</strong> ${cloud.kms || 0}</p>
                            <p><strong>Per Diem:</strong> ${cloud.perDiem || 'none'}</p>
                            <p><strong>Expenses:</strong> Hotel: $${cloud.hotelExpense || 0}, Gas: $${cloud.gasExpense || 0}, Food: $${cloud.foodExpense || 0}</p>
                            <p><strong>Locations:</strong> ${(cloud.locations || []).join(', ') || 'None'}</p>
                            <p><strong>Notes:</strong> ${cloud.notes || 'None'}</p>
                        </div>
                        <label><input type="radio" name="conflict-${index}" value="cloud"> Keep Cloud Version</label>
                    </div>
                </div>
            </div>
        `;
    }

    setupConflictModalListeners(modal, conflicts, resolve) {
        const overwriteCloud = modal.querySelector('#overwrite-cloud');
        const overwriteDevice = modal.querySelector('#overwrite-device');
        const chooseEach = modal.querySelector('#choose-each');
        const individualSection = modal.querySelector('#individual-conflicts');
        const applyChoices = modal.querySelector('#apply-choices');
        const cancelSync = modal.querySelector('#cancel-sync');

        overwriteCloud?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'overwrite-cloud' });
        });

        overwriteDevice?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'overwrite-device' });
        });

        chooseEach?.addEventListener('click', () => {
            individualSection.style.display = 'block';
            overwriteCloud.style.display = 'none';
            overwriteDevice.style.display = 'none';
            chooseEach.style.display = 'none';
        });

        applyChoices?.addEventListener('click', () => {
            const choices = [];
            conflicts.forEach((_, index) => {
                const selected = modal.querySelector(`input[name="conflict-${index}"]:checked`);
                choices.push(selected ? selected.value : 'local');
            });
            this.removeConflictModal(modal);
            resolve({ type: 'individual', choices });
        });

        cancelSync?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'cancel' });
        });
    }

    removeConflictModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    applyConflictResolution(conflicts, resolution, entriesToUpload, entriesToDownload) {
        if (resolution.type === 'cancel') {
            console.log('Sync cancelled by user');
            throw new Error('Sync cancelled by user');
        }

        if (resolution.type === 'overwrite-cloud') {
            // Keep all local versions (upload them)
            conflicts.forEach(conflict => {
                entriesToUpload.push(conflict.local);
            });
            console.log(`Resolved ${conflicts.length} conflicts: keeping device data`);
        } else if (resolution.type === 'overwrite-device') {
            // Keep all cloud versions (download them)
            conflicts.forEach(conflict => {
                entriesToDownload.push(conflict.cloud);
            });
            console.log(`Resolved ${conflicts.length} conflicts: keeping cloud data`);
        } else if (resolution.type === 'individual') {
            // Apply individual choices
            conflicts.forEach((conflict, index) => {
                const choice = resolution.choices[index];
                if (choice === 'local') {
                    entriesToUpload.push(conflict.local);
                } else {
                    entriesToDownload.push(conflict.cloud);
                }
            });
            console.log(`Resolved ${conflicts.length} conflicts individually`);
        }
    }

    async showConflictResolutionDialog(conflicts) {
        return new Promise((resolve) => {
            // Create conflict resolution modal
            const modal = this.createConflictModal(conflicts, resolve);
            document.body.appendChild(modal);
        });
    }

    createConflictModal(conflicts, resolve) {
        const modal = document.createElement('div');
        modal.className = 'conflict-modal';
        modal.innerHTML = `
            <div class="conflict-modal-content">
                <h2>🔄 Sync Conflicts Detected</h2>
                <p>Found ${conflicts.length} conflicting entries between your device and cloud storage.</p>
                
                <div class="conflict-options">
                    <button id="overwrite-cloud" class="conflict-btn primary">📤 Overwrite Cloud (Keep Device Data)</button>
                    <button id="overwrite-device" class="conflict-btn">📥 Overwrite Device (Keep Cloud Data)</button>
                    <button id="choose-each" class="conflict-btn">🔍 Choose for Each Entry</button>
                </div>
                
                <div id="individual-conflicts" style="display: none;">
                    ${conflicts.map((conflict, index) => this.createConflictComparisonHTML(conflict, index)).join('')}
                    <div class="conflict-actions">
                        <button id="apply-choices" class="conflict-btn primary">Apply Choices</button>
                        <button id="cancel-sync" class="conflict-btn">Cancel Sync</button>
                    </div>
                </div>
            </div>
            <div class="conflict-modal-overlay"></div>
        `;

        // Add event listeners
        this.setupConflictModalListeners(modal, conflicts, resolve);
        
        return modal;
    }

    createConflictComparisonHTML(conflict, index) {
        const local = conflict.local;
        const cloud = conflict.cloud;
        
        const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleString();
        };
        
        return `
            <div class="conflict-entry" data-index="${index}">
                <h3>Entry for ${local.date}</h3>
                <div class="conflict-comparison">
                    <div class="conflict-option local">
                        <h4>📱 Device Version</h4>
                        <div class="entry-details">
                            <p><strong>Last Modified:</strong> ${formatDate(local.lastModified || local.createdAt)}</p>
                            <p><strong>Points:</strong> ${local.points || 0}</p>
                            <p><strong>Kilometers:</strong> ${local.kms || 0}</p>
                            <p><strong>Per Diem:</strong> ${local.perDiem || 'none'}</p>
                            <p><strong>Expenses:</strong> Hotel: $${local.hotelExpense || 0}, Gas: $${local.gasExpense || 0}, Food: $${local.foodExpense || 0}</p>
                            <p><strong>Locations:</strong> ${(local.landLocations || []).join(', ') || 'None'}</p>
                            <p><strong>Notes:</strong> ${local.notes || 'None'}</p>
                        </div>
                        <label><input type="radio" name="conflict-${index}" value="local" checked> Keep Device Version</label>
                    </div>
                    <div class="conflict-option cloud">
                        <h4>☁️ Cloud Version</h4>
                        <div class="entry-details">
                            <p><strong>Last Modified:</strong> ${formatDate(cloud.lastModified || cloud.createdAt)}</p>
                            <p><strong>Points:</strong> ${cloud.points || 0}</p>
                            <p><strong>Kilometers:</strong> ${cloud.kms || 0}</p>
                            <p><strong>Per Diem:</strong> ${cloud.perDiem || 'none'}</p>
                            <p><strong>Expenses:</strong> Hotel: $${cloud.hotelExpense || 0}, Gas: $${cloud.gasExpense || 0}, Food: $${cloud.foodExpense || 0}</p>
                            <p><strong>Locations:</strong> ${(cloud.landLocations || []).join(', ') || 'None'}</p>
                            <p><strong>Notes:</strong> ${cloud.notes || 'None'}</p>
                        </div>
                        <label><input type="radio" name="conflict-${index}" value="cloud"> Keep Cloud Version</label>
                    </div>
                </div>
            </div>
        `;
    }

    setupConflictModalListeners(modal, conflicts, resolve) {
        const overwriteCloud = modal.querySelector('#overwrite-cloud');
        const overwriteDevice = modal.querySelector('#overwrite-device');
        const chooseEach = modal.querySelector('#choose-each');
        const individualSection = modal.querySelector('#individual-conflicts');
        const applyChoices = modal.querySelector('#apply-choices');
        const cancelSync = modal.querySelector('#cancel-sync');

        overwriteCloud?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'overwrite-cloud' });
        });

        overwriteDevice?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'overwrite-device' });
        });

        chooseEach?.addEventListener('click', () => {
            individualSection.style.display = 'block';
            overwriteCloud.style.display = 'none';
            overwriteDevice.style.display = 'none';
            chooseEach.style.display = 'none';
        });

        applyChoices?.addEventListener('click', () => {
            const choices = [];
            conflicts.forEach((_, index) => {
                const selected = modal.querySelector(`input[name="conflict-${index}"]:checked`);
                choices.push(selected ? selected.value : 'local');
            });
            this.removeConflictModal(modal);
            resolve({ type: 'individual', choices });
        });

        cancelSync?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'cancel' });
        });
    }

    removeConflictModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    applyConflictResolution(conflicts, resolution, entriesToUpload, entriesToDownload) {
        if (resolution.type === 'cancel') {
            console.log('Sync cancelled by user');
            throw new Error('Sync cancelled by user');
        }

        if (resolution.type === 'overwrite-cloud') {
            // Keep all local versions (upload them)
            conflicts.forEach(conflict => {
                entriesToUpload.push(conflict.local);
            });
            console.log(`Resolved ${conflicts.length} conflicts: keeping device data`);
        } else if (resolution.type === 'overwrite-device') {
            // Keep all cloud versions (download them)
            conflicts.forEach(conflict => {
                entriesToDownload.push(conflict.cloud);
            });
            console.log(`Resolved ${conflicts.length} conflicts: keeping cloud data`);
        } else if (resolution.type === 'individual') {
            // Apply individual choices
            conflicts.forEach((conflict, index) => {
                const choice = resolution.choices[index];
                if (choice === 'local') {
                    entriesToUpload.push(conflict.local);
                } else {
                    entriesToDownload.push(conflict.cloud);
                }
            });
            console.log(`Resolved ${conflicts.length} conflicts individually`);
        }
    }

    async showConflictResolutionDialog(conflicts) {
        return new Promise((resolve) => {
            // Create conflict resolution modal
            const modal = this.createConflictModal(conflicts, resolve);
            document.body.appendChild(modal);
        });
    }

    createConflictModal(conflicts, resolve) {
        const modal = document.createElement('div');
        modal.className = 'conflict-modal';
        modal.innerHTML = `
            <div class="conflict-modal-content">
                <h2>🔄 Sync Conflicts Detected</h2>
                <p>Found ${conflicts.length} conflicting entries between your device and cloud storage.</p>
                
                <div class="conflict-options">
                    <button id="overwrite-cloud" class="conflict-btn primary">📤 Overwrite Cloud (Keep Device Data)</button>
                    <button id="overwrite-device" class="conflict-btn">📥 Overwrite Device (Keep Cloud Data)</button>
                    <button id="choose-each" class="conflict-btn">🔍 Choose for Each Entry</button>
                </div>
                
                <div id="individual-conflicts" style="display: none;">
                    ${conflicts.map((conflict, index) => this.createConflictComparisonHTML(conflict, index)).join('')}
                    <div class="conflict-actions">
                        <button id="apply-choices" class="conflict-btn primary">Apply Choices</button>
                        <button id="cancel-sync" class="conflict-btn">Cancel Sync</button>
                    </div>
                </div>
            </div>
            <div class="conflict-modal-overlay"></div>
        `;

        // Add event listeners
        this.setupConflictModalListeners(modal, conflicts, resolve);
        
        return modal;
    }

    createConflictComparisonHTML(conflict, index) {
        const local = conflict.local;
        const cloud = conflict.cloud;
        
        const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleString();
        };
        
        return `
            <div class="conflict-entry" data-index="${index}">
                <h3>Entry for ${local.date}</h3>
                <div class="conflict-comparison">
                    <div class="conflict-option local">
                        <h4>📱 Device Version</h4>
                        <div class="entry-details">
                            <p><strong>Last Modified:</strong> ${formatDate(local.lastModified || local.createdAt)}</p>
                            <p><strong>Points:</strong> ${local.points || 0}</p>
                            <p><strong>Kilometers:</strong> ${local.kms || 0}</p>
                            <p><strong>Per Diem:</strong> ${local.perDiem || 'none'}</p>
                            <p><strong>Expenses:</strong> Hotel: $${local.hotelExpense || 0}, Gas: $${local.gasExpense || 0}, Food: $${local.foodExpense || 0}</p>
                            <p><strong>Locations:</strong> ${(local.landLocations || []).join(', ') || 'None'}</p>
                            <p><strong>Notes:</strong> ${local.notes || 'None'}</p>
                        </div>
                        <label><input type="radio" name="conflict-${index}" value="local" checked> Keep Device Version</label>
                    </div>
                    <div class="conflict-option cloud">
                        <h4>☁️ Cloud Version</h4>
                        <div class="entry-details">
                            <p><strong>Last Modified:</strong> ${formatDate(cloud.lastModified || cloud.createdAt)}</p>
                            <p><strong>Points:</strong> ${cloud.points || 0}</p>
                            <p><strong>Kilometers:</strong> ${cloud.kms || 0}</p>
                            <p><strong>Per Diem:</strong> ${cloud.perDiem || 'none'}</p>
                            <p><strong>Expenses:</strong> Hotel: $${cloud.hotelExpense || 0}, Gas: $${cloud.gasExpense || 0}, Food: $${cloud.foodExpense || 0}</p>
                            <p><strong>Locations:</strong> ${(cloud.landLocations || []).join(', ') || 'None'}</p>
                            <p><strong>Notes:</strong> ${cloud.notes || 'None'}</p>
                        </div>
                        <label><input type="radio" name="conflict-${index}" value="cloud"> Keep Cloud Version</label>
                    </div>
                </div>
            </div>
        `;
    }

    setupConflictModalListeners(modal, conflicts, resolve) {
        const overwriteCloud = modal.querySelector('#overwrite-cloud');
        const overwriteDevice = modal.querySelector('#overwrite-device');
        const chooseEach = modal.querySelector('#choose-each');
        const individualSection = modal.querySelector('#individual-conflicts');
        const applyChoices = modal.querySelector('#apply-choices');
        const cancelSync = modal.querySelector('#cancel-sync');

        overwriteCloud?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'overwrite-cloud' });
        });

        overwriteDevice?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'overwrite-device' });
        });

        chooseEach?.addEventListener('click', () => {
            individualSection.style.display = 'block';
            overwriteCloud.style.display = 'none';
            overwriteDevice.style.display = 'none';
            chooseEach.style.display = 'none';
        });

        applyChoices?.addEventListener('click', () => {
            const choices = [];
            conflicts.forEach((_, index) => {
                const selected = modal.querySelector(`input[name="conflict-${index}"]:checked`);
                choices.push(selected ? selected.value : 'local');
            });
            this.removeConflictModal(modal);
            resolve({ type: 'individual', choices });
        });

        cancelSync?.addEventListener('click', () => {
            this.removeConflictModal(modal);
            resolve({ type: 'cancel' });
        });
    }

    removeConflictModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    applyConflictResolution(conflicts, resolution, entriesToUpload, entriesToDownload) {
        if (resolution.type === 'cancel') {
            console.log('Sync cancelled by user');
            throw new Error('Sync cancelled by user');
        }

        if (resolution.type === 'overwrite-cloud') {
            // Keep all local versions (upload them)
            conflicts.forEach(conflict => {
                entriesToUpload.push(conflict.local);
            });
            console.log(`Resolved ${conflicts.length} conflicts: keeping device data`);
        } else if (resolution.type === 'overwrite-device') {
            // Keep all cloud versions (download them)
            conflicts.forEach(conflict => {
                entriesToDownload.push(conflict.cloud);
            });
            console.log(`Resolved ${conflicts.length} conflicts: keeping cloud data`);
        } else if (resolution.type === 'individual') {
            // Apply individual choices
            conflicts.forEach((conflict, index) => {
                const choice = resolution.choices[index];
                if (choice === 'local') {
                    entriesToUpload.push(conflict.local);
                } else {
                    entriesToDownload.push(conflict.cloud);
                }
            });
            console.log(`Resolved ${conflicts.length} conflicts individually`);
        }
    }

    async performManualSyncAll() {
        if (!window.authManager?.getCurrentUser()) {
            window.uiManager?.showNotification('Please sign in to sync all data', true);
            return;
        }
        
        if (!window.authManager?.isEmailVerified()) {
            window.uiManager?.showNotification('Please verify your email address to sync data', true);
            return;
        }

        if (this.isSyncing) {
            window.uiManager?.showNotification('Sync already in progress', true);
            return;
        }

        try {
            const userId = window.authManager.getUserId();
            const allLocalEntries = await window.dbFunctions.getAllFromDB('entries');
            const allCloudEntries = await window.cloudStorage.getAllEntriesFromCloud(userId);

            // Calculate data sizes
            const localDataSize = this.calculateDataSize(allLocalEntries);
            const cloudDataSize = this.calculateDataSize(allCloudEntries);

            // Show sync direction choice dialog
            const direction = await this.showSyncAllDialog(allLocalEntries.length, allCloudEntries.length, localDataSize, cloudDataSize);
            
            if (direction === 'cancel') {
                return;
            }

            this.isSyncing = true;
            this.updateSyncStatusUI();

            if (direction === 'upload') {
                // Upload all local data to cloud (overwrite cloud)
                console.log('Uploading all local data to cloud...');
                await this.uploadAllLocalData(allLocalEntries);
                
                // Upload settings as well
                if (window.settingsManager?.uploadSettingsToCloud) {
                    await window.settingsManager.uploadSettingsToCloud();
                }
                
                window.uiManager?.showNotification(`Successfully uploaded ${allLocalEntries.length} entries and settings to cloud`);
            } else if (direction === 'download') {
                // Download all cloud data to device (overwrite local)
                console.log('Downloading all cloud data to device...');
                await this.downloadAllCloudData(allCloudEntries);
                
                // Download settings as well
                if (window.settingsManager?.downloadSettingsFromCloud) {
                    await window.settingsManager.downloadSettingsFromCloud();
                }
                
                window.uiManager?.showNotification(`Successfully downloaded ${allCloudEntries.length} entries and settings from cloud`);
            }

            this.updateLastSyncTime();
            
        } catch (error) {
            console.error('Manual sync all failed:', error);
            window.uiManager?.showNotification('Sync all failed: ' + error.message, true);
        } finally {
            this.isSyncing = false;
            this.updateSyncStatusUI();
        }
    }

    calculateDataSize(entries) {
        const jsonString = JSON.stringify(entries);
        const sizeInBytes = new Blob([jsonString]).size;
        
        if (sizeInBytes < 1024) {
            return sizeInBytes + ' bytes';
        } else if (sizeInBytes < 1024 * 1024) {
            return (sizeInBytes / 1024).toFixed(1) + ' KB';
        } else {
            return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    }

    async showSyncAllDialog(localCount, cloudCount, localSize, cloudSize) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'conflict-modal';
            modal.innerHTML = `
                <div class="conflict-modal-content">
                    <h2>🔄 Sync All Data</h2>
                    <p>Choose which data to keep. This will overwrite the other location completely.</p>
                    
                    <div class="sync-all-options">
                        <div class="sync-option">
                            <h3>📱 Upload Device Data to Cloud</h3>
                            <p><strong>Local entries:</strong> ${localCount}</p>
                            <p><strong>Data size:</strong> ${localSize}</p>
                            <p>This will <strong>overwrite all cloud data</strong> with your device data.</p>
                            <button id="upload-all" class="conflict-btn primary">Upload to Cloud</button>
                        </div>
                        
                        <div class="sync-option">
                            <h3>☁️ Download Cloud Data to Device</h3>
                            <p><strong>Cloud entries:</strong> ${cloudCount}</p>
                            <p><strong>Data size:</strong> ${cloudSize}</p>
                            <p>This will <strong>overwrite all device data</strong> with cloud data.</p>
                            <button id="download-all" class="conflict-btn primary">Download from Cloud</button>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button id="cancel-sync-all" class="conflict-btn">Cancel</button>
                    </div>
                </div>
                <div class="conflict-modal-overlay"></div>
            `;

            // Add event listeners
            modal.querySelector('#upload-all')?.addEventListener('click', () => {
                this.removeConflictModal(modal);
                resolve('upload');
            });

            modal.querySelector('#download-all')?.addEventListener('click', () => {
                this.removeConflictModal(modal);
                resolve('download');
            });

            modal.querySelector('#cancel-sync-all')?.addEventListener('click', () => {
                this.removeConflictModal(modal);
                resolve('cancel');
            });

            document.body.appendChild(modal);
        });
    }

    showPermissionError() {
        this.hasPermissionError = true;
        
        const syncStatus = document.getElementById('sync-status');
        const syncText = document.getElementById('sync-text');
        const syncIndicator = document.getElementById('sync-indicator');
        
        if (syncStatus && syncText && syncIndicator) {
            syncStatus.style.display = 'block';
            syncIndicator.textContent = '🔒';
            syncText.textContent = 'Local Only';
            syncStatus.title = 'Cloud sync unavailable - data saved locally only';
        }
        
        // Show user notification
        if (window.uiManager) {
            window.uiManager.showNotification('Cloud sync unavailable. All data will be saved locally.', false);
        }
    }

    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            isOnline: this.isOnline,
            lastSyncTime: this.lastSyncTime,
            isSignedIn: !!window.authManager?.getCurrentUser(),
            hasConflicts: this.syncConflicts.length > 0,
            hasPermissionError: this.hasPermissionError,
            performManualSyncAll: this.performManualSyncAll.bind(this)
        };
    }
}

// Initialize sync manager
window.syncManager = new SyncManager();