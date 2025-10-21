/**
 * Entry Manager Module
 * Handles all daily entry CRUD operations, form management, and data validation
 * for the ProfitTracker application. This module manages the creation, editing,
 * deletion, and display of daily work entries including points, kilometers,
 * per diem, expenses, and land locations.
 */

/**
 * Saves a new daily entry or updates an existing one with form data
 * Collects all form inputs including points, kilometers, expenses, notes,
 * and land locations, then saves to IndexedDB. Handles duplicate date
 * checking and user confirmation for overwrites.
 * 
 * @async
 * @function saveEntry
 * @returns {Promise<void>} Resolves when entry is successfully saved
 * @throws {Error} If database save operation fails
 */
async function saveEntry() {
    // Extract form input values with safe parsing and defaults
    const dateInput = document.getElementById('work-date').value;
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    
    // Get selected per diem option
    const perDiemRadio = document.querySelector('input[name="per-diem"]:checked');
    const perDiem = perDiemRadio ? perDiemRadio.value : 'none';
    const notes = document.getElementById('notes').value;
    
    // Extract expense values from form inputs with fallback to 0
    const hotelExpense = parseFloat(document.getElementById('hotel-expense').value) || 0;
    const gasExpense = parseFloat(document.getElementById('gas-expense').value) || 0;
    const foodExpense = parseFloat(document.getElementById('food-expense').value) || 0;
    
    // Structure expense data for database storage
    const expenses = {
        hotel: hotelExpense,
        gas: gasExpense,
        food: foodExpense
    };

    // Get current land locations from the location manager
    const landLocations = window.locationManager.getLandLocations();

    // Check for existing entries on the same date to prevent duplicates
    const existingEntries = await window.dbFunctions.getAllFromDB('entries');
    const existingEntry = existingEntries.find(entry => entry.date === dateInput);
    
    let entry;
    let isUpdate = false;

    // Handle duplicate date scenario with user confirmation
    if (existingEntry) {
        const keepNew = confirm(`An entry already exists for ${window.dateUtils.formatDateForDisplay(dateInput)}.\n\n` +
                              `Existing: ${existingEntry.points} pts, ${existingEntry.kms} km\n` +
                              `New: ${points} pts, ${kms} km\n\n` +
                              `Keep new entry? (Cancel to keep old entry)`);
        
        // If user cancels, abort save operation
        if (!keepNew) {
            window.uiManager.showNotification('Entry not saved - kept existing entry');
            return;
        }

        // Update existing entry instead of deleting and recreating
        isUpdate = true;
        entry = {
            id: existingEntry.id, // Keep the existing ID
            date: dateInput,
            points,
            kms,
            perDiem,
            notes,
            expenses,
            landLocations,
            timestamp: new Date().getTime(),
            lastModified: new Date().toISOString(),
            createdAt: existingEntry.createdAt || new Date().toISOString() // Preserve original creation time
        };
    } else {
        // Create new entry
        entry = {
            date: dateInput,
            points,
            kms,
            perDiem,
            notes,
            expenses,
            landLocations,
            timestamp: new Date().getTime(),
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
    }

    // Attempt to save entry to database with error handling
    try {
        await window.dbFunctions.saveToDB('entries', entry);
        
        // If user is signed in and email verified, also save to cloud
        if (window.authManager?.getCurrentUser() && window.authManager?.isEmailVerified()) {
            try {
                const userId = window.authManager.getCurrentUser().uid;
                await window.cloudStorage.saveEntryToCloud(userId, entry);
                console.log('Entry saved to cloud');
            } catch (cloudError) {
                console.warn('Failed to save to cloud, will sync later:', cloudError);
                // Don't fail the entire operation if cloud save fails
            }
        }
        
        // Refresh UI components after successful save
        window.calculations.calculateEarnings();
        loadEntries(); // Reload entries list to show updated data
        clearForm();   // Reset form for next entry
        
        window.uiManager.showNotification(isUpdate ? 'Entry updated successfully!' : 'Entry saved successfully!');
    } catch (error) {
        console.error('Error saving entry:', error);
        window.uiManager.showNotification('Error saving entry', true);
    }
}

/**
 * Clears all form inputs and resets the daily entry form to default state
 * Resets all input fields, checkboxes, expenses, land locations, and 
 * recalculates earnings display. Typically called after successful save
 * or when user wants to start fresh.
 * 
 * @function clearForm
 * @returns {void}
 */
function clearForm() {
    // Clear primary input fields
    document.getElementById('points').value = '';
    document.getElementById('kms').value = '';
    
    // Reset per diem to "full" (default)
    document.querySelector('input[name="per-diem"][value="full"]').checked = true;
    document.getElementById('notes').value = '';
    
    // Clear all expense input fields
    document.getElementById('hotel-expense').value = '';
    document.getElementById('gas-expense').value = '';
    document.getElementById('food-expense').value = '';
    
    // Clear land locations section
    window.locationManager.clearLandLocations();
    
    // Reset date to today and recalculate earnings display
    initializeDate();
    window.calculations.calculateEarnings();
}

/**
 * Populates the daily entry form with data from an existing entry for editing
 * Takes an entry object and fills all form fields with its data including
 * points, kilometers, expenses, notes, and land locations. Used when user
 * clicks on an existing entry to modify it.
 * 
 * @function populateFormForEdit
 * @param {Object} entry - The entry object containing all saved data
 * @param {string} entry.date - ISO date string (YYYY-MM-DD)
 * @param {number} entry.points - Number of points earned
 * @param {number} entry.kms - Number of kilometers driven
 * @param {string|boolean} entry.perDiem - Per diem type ('full'/'partial'/'none') or legacy boolean
 * @param {string} entry.notes - Optional notes text
 * @param {Object} entry.expenses - Expense breakdown object
 * @param {Array<string>} entry.landLocations - Array of land location names
 * @returns {void}
 */
function populateFormForEdit(entry) {
    // Populate primary form fields with entry data
    document.getElementById('work-date').value = entry.date;
    document.getElementById('points').value = entry.points;
    document.getElementById('kms').value = entry.kms;
    
    // Set per diem radio button - handle both old boolean and new string format
    const perDiemValue = typeof entry.perDiem === 'boolean' ? 
        (entry.perDiem ? 'full' : 'none') : entry.perDiem;
    const perDiemRadio = document.querySelector(`input[name="per-diem"][value="${perDiemValue}"]`);
    if (perDiemRadio) {
        perDiemRadio.checked = true;
    } else {
        // Default to 'none' if value not found
        document.querySelector('input[name="per-diem"][value="none"]').checked = true;
    }
    document.getElementById('notes').value = entry.notes || '';
    
    // Populate expense fields with fallback to empty values
    const expenses = entry.expenses || {};
    document.getElementById('hotel-expense').value = expenses.hotel || '';
    document.getElementById('gas-expense').value = expenses.gas || '';
    document.getElementById('food-expense').value = expenses.food || '';
    
    // Populate land locations section with saved locations
    window.locationManager.setLandLocations(entry.landLocations || []);
    
    // Recalculate and display updated earnings
    window.calculations.calculateEarnings();
    
    // Scroll form into view for better user experience on mobile
    document.getElementById('daily-entry').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Checks if an entry exists for the given date and auto-populates the form
 * Used when user changes the date picker to automatically load existing
 * data for that date or clear the form if no entry exists. Includes smart
 * data preservation - asks user if they want to keep current form data
 * when switching to a date with no existing entry.
 * 
 * @async
 * @function checkAndPopulateExistingEntry
 * @param {string} date - ISO date string (YYYY-MM-DD) to check for existing entry
 * @returns {Promise<void>} Resolves when form population is complete
 */
async function checkAndPopulateExistingEntry(date) {
    try {
        // Retrieve all entries and search for matching date
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
        const existingEntry = allEntries.find(entry => entry.date === date);
        
        if (existingEntry) {
            // Auto-populate form with existing entry data (no scrolling)
            document.getElementById('points').value = existingEntry.points;
            document.getElementById('kms').value = existingEntry.kms;
            
            // Set per diem radio button - handle both old boolean and new string format
            const perDiemValue = typeof existingEntry.perDiem === 'boolean' ? 
                (existingEntry.perDiem ? 'full' : 'none') : existingEntry.perDiem;
            const perDiemRadio = document.querySelector(`input[name="per-diem"][value="${perDiemValue}"]`);
            if (perDiemRadio) {
                perDiemRadio.checked = true;
            } else {
                // Default to 'none' if value not found
                document.querySelector('input[name="per-diem"][value="none"]').checked = true;
            }
            document.getElementById('notes').value = existingEntry.notes || '';
            
            // Populate expense fields with existing data
            const expenses = existingEntry.expenses || {};
            document.getElementById('hotel-expense').value = expenses.hotel || '';
            document.getElementById('gas-expense').value = expenses.gas || '';
            document.getElementById('food-expense').value = expenses.food || '';
            
            // Populate saved land locations for this date
            window.locationManager.setLandLocations(existingEntry.landLocations || []);
            
            // Update earnings display with loaded data
            window.calculations.calculateEarnings();
        } else if((document.getElementById('points').value !== '' ||
                  document.getElementById('kms').value !== '' ||
                  document.getElementById('notes').value !== '' ||
                  document.getElementById('hotel-expense').value !== '' ||
                  document.getElementById('gas-expense').value !== '' ||
                  document.getElementById('food-expense').value !== '' ||
                  window.locationManager.getLandLocations().length > 0 ) && 
                 confirm('No entry exists for this date. Keep data currently in form? ("OK" for yes, "Cancel" to clear entries)')){
            
            // User chose to keep current form data - just recalculate earnings
            window.calculations.calculateEarnings();
        } else {    
            // No existing entry and user wants fresh form OR no current data exists
            // Clear all form fields for new entry (preserve date)
            document.getElementById('points').value = '';
            document.getElementById('kms').value = '';
            document.querySelector('input[name="per-diem"][value="full"]').checked = true;
            document.getElementById('notes').value = '';
            document.getElementById('hotel-expense').value = '';
            document.getElementById('gas-expense').value = '';
            document.getElementById('food-expense').value = '';
            
            // Clear land locations for fresh entry
            window.locationManager.clearLandLocations();
            
            // Reset earnings display to zero values
            window.calculations.calculateEarnings();
        }
    } catch (error) {
        console.error('Error checking for existing entry:', error);
    }
}

/**
 * Loads and displays all entries for the current pay period
 * Retrieves entries from database, filters by current pay period dates,
 * generates HTML for each entry including all data (points, expenses, 
 * land locations), and sets up click handlers for editing. Also calculates
 * and displays pay period summary totals.
 * 
 * @async
 * @function loadEntries
 * @returns {Promise<void>} Resolves when entries are loaded and displayed
 */
async function loadEntries() {
    try {
        // Get all entries from database
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
        
        // Filter entries to current pay period date range
        const payPeriodEnd = window.dateUtils.getPayPeriodEnd(window.appState.currentPayPeriodStart);
        const entries = allEntries.filter(entry => 
            entry.date >= window.appState.currentPayPeriodStart && entry.date <= payPeriodEnd
        );
        
        const entriesList = document.getElementById('entries-list');
        
        // Handle empty pay period case
        if (entries.length === 0) {
            entriesList.innerHTML = '<p>No entries for this pay period</p>';
            window.uiManager.updatePayPeriodSummary(null);
            return;
        }
        
        // Sort entries by date (most recent first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calculate totals for pay period summary
        const payPeriodTotals = window.calculations.calculatePayPeriodTotals(entries);
        window.uiManager.updatePayPeriodSummary(payPeriodTotals);
        
        entriesList.innerHTML = entries.map(entry => {
            const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
            const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
            const perDiemFullRate = parseFloat(document.getElementById('per-diem-full-rate').value) || 171;
            const perDiemPartialRate = parseFloat(document.getElementById('per-diem-partial-rate').value) || 46;
            const includeGST = document.getElementById('gst-enabled').checked;
            
            // Calculate total dynamically based on current settings
            const expenses = entry.expenses || {};
            const entryTotals = window.calculations.calculateEntryTotal(entry.points, entry.kms, entry.perDiem, expenses);
            
            // Prepare expense data for editing
            const expenseData = JSON.stringify(expenses).replace(/"/g, '&quot;');
            
            // Prepare land locations data for editing
            const landLocationsData = JSON.stringify(entry.landLocations || []).replace(/"/g, '&quot;');
            
            return `
                <div class="entry-item editable-entry" 
                     data-id="${entry.id}"
                     data-date="${entry.date}" 
                     data-points="${entry.points}" 
                     data-kms="${entry.kms}" 
                     data-per-diem="${entry.perDiem}" 
                     data-notes="${entry.notes || ''}"
                     data-expenses="${expenseData}"
                     data-land-locations="${landLocationsData}">
                    <div class="entry-header">
                        <span class="entry-date">${window.dateUtils.formatDateForDisplay(entry.date)}</span>
                        <span class="entry-total">Net: $${entryTotals.netTotal.toFixed(2)}</span>
                    </div>
                    <div class="entry-details">
                        <div class="entry-row">
                            <span>Points: ${entry.points}</span>
                            <span>$${(entry.points * pointRate).toFixed(2)}</span>
                        </div>
                        <div class="entry-row">
                            <span>KMs: ${entry.kms}</span>
                            <span>$${(entry.kms * kmRate).toFixed(2)}</span>
                        </div>
                        ${(() => {
                            // Handle both old boolean and new string format for per diem
                            const perDiemValue = typeof entry.perDiem === 'boolean' ? 
                                (entry.perDiem ? 'full' : 'none') : entry.perDiem;
                            
                            if (perDiemValue === 'full') {
                                return `<div class="entry-row">
                                    <span>Per Diem (Full):</span>
                                    <span>$${perDiemFullRate.toFixed(2)}</span>
                                </div>`;
                            } else if (perDiemValue === 'partial') {
                                return `<div class="entry-row">
                                    <span>Per Diem (Partial):</span>
                                    <span>$${perDiemPartialRate.toFixed(2)}</span>
                                </div>`;
                            }
                            return '';
                        })()}
                        ${includeGST ? `
                        <div class="entry-row">
                            <span>GST:</span>
                            <span>$${entryTotals.gstAmount.toFixed(2)}</span>
                        </div>` : ''}
                        <div class="entry-row">
                            <span><strong>Gross Total:</strong></span>
                            <span><strong>$${entryTotals.grossTotal.toFixed(2)}</strong></span>
                        </div>
                        ${entryTotals.totalExpenses > 0 ? `
                        <div class="entry-row">
                            <span>Hotel:</span>
                            <span>-$${expenses.hotel.toFixed(2)}</span>
                        </div>
                        <div class="entry-row">
                            <span>Gas:</span>
                            <span>-$${expenses.gas.toFixed(2)}</span>
                        </div>
                        <div class="entry-row">
                            <span>Food:</span>
                            <span>-$${expenses.food.toFixed(2)}</span>
                        </div>
                        <div class="entry-row">
                            <span>Total Expenses:</span>
                            <span>-$${entryTotals.totalExpenses.toFixed(2)}</span>
                        </div>` : ''}
                        ${entry.notes ? `<div class="entry-notes">Notes: ${entry.notes}</div>` : ''}
                        ${entry.landLocations && entry.landLocations.length > 0 ? `
                        <div class="entry-land-locations">
                            <strong>Land Locations:</strong>
                            <div class="land-locations-list">
                                ${entry.landLocations.map(location => `<span class="location-tag">${location}</span>`).join('')}
                            </div>
                        </div>` : ''}
                        <button class="delete-entry" data-id="${entry.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.delete-entry').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = parseInt(e.target.dataset.id);
                await deleteEntry(id);
            });
        });
        
        // Add click event listeners for editing entries
        const editableEntries = document.querySelectorAll('.editable-entry');
        editableEntries.forEach(entryElement => {
            entryElement.addEventListener('click', (e) => {
                // Don't trigger edit when clicking the delete button
                if (e.target.classList.contains('delete-entry')) {
                    return;
                }
                
                const expenseData = entryElement.dataset.expenses;
                let expenses = {};
                try {
                    expenses = JSON.parse(expenseData.replace(/&quot;/g, '"'));
                } catch (error) {
                    expenses = {};
                }
                
                const landLocationsData = entryElement.dataset.landLocations;
                let landLocations = [];
                try {
                    landLocations = JSON.parse(landLocationsData.replace(/&quot;/g, '"'));
                } catch (error) {
                    landLocations = [];
                }
                
                const entryData = {
                    id: parseInt(entryElement.dataset.id),
                    date: entryElement.dataset.date,
                    points: parseFloat(entryElement.dataset.points),
                    kms: parseFloat(entryElement.dataset.kms),
                    perDiem: entryElement.dataset.perDiem,
                    notes: entryElement.dataset.notes,
                    expenses: expenses,
                    landLocations: landLocations
                };
                populateFormForEdit(entryData);
            });
        });
    } catch (error) {
        console.error('Error loading entries:', error);
    }
}

/**
 * Deletes an entry from the database after user confirmation
 * Shows confirmation dialog to prevent accidental deletions, then removes
 * the entry from database and refreshes the entries display. Includes
 * error handling and user feedback notifications.
 * 
 * @async
 * @function deleteEntry
 * @param {number} id - The unique database ID of the entry to delete
 * @returns {Promise<void>} Resolves when deletion is complete
 */
async function deleteEntry(id) {
    // Get user confirmation before proceeding with irreversible deletion
    const confirmDelete = confirm('Are you sure you want to delete this entry?\nThis action cannot be undone.');
    if (!confirmDelete) {
        window.uiManager.showNotification('Deletion cancelled');
        return;
    }
    
    try {
        await window.dbFunctions.deleteFromDB('entries', id);
        
        // If user is signed in and email verified, also delete from cloud
        if (window.authManager?.getCurrentUser() && window.authManager?.isEmailVerified()) {
            try {
                const userId = window.authManager.getCurrentUser().uid;
                await window.cloudStorage.deleteEntryFromCloud(userId, id);
                console.log('Entry deleted from cloud');
            } catch (cloudError) {
                console.warn('Failed to delete from cloud, will sync later:', cloudError);
                // Don't fail the entire operation if cloud delete fails
            }
        }
        
        loadEntries();
        window.uiManager.showNotification('Entry deleted');
    } catch (error) {
        console.error('Error deleting entry:', error);
        window.uiManager.showNotification('Error deleting entry', true);
    }
}

/**
 * Initializes the date picker with today's date and auto-loads existing entry
 * Sets both the date input field and display text to today's date, then
 * checks if an entry already exists for today and populates the form
 * if found. Called during app initialization and form clearing.
 * 
 * @function initializeDate
 * @returns {void}
 */
function initializeDate() {
    const today = new Date();
    const todayFormatted = window.dateUtils.formatDateForInput(today);
    
    // Set date picker and display to today's date
    document.getElementById('work-date').value = todayFormatted;
    document.getElementById('date-display').textContent = window.dateUtils.formatDateForDisplay(todayFormatted);
    
    // Auto-populate form if entry already exists for today
    checkAndPopulateExistingEntry(todayFormatted);
}

/**
 * Removes duplicate entries for the same date, keeping the most recent one
 * This function can be called to clean up any duplicate entries that may have been created
 * 
 * @async
 * @function removeDuplicateEntries
 * @returns {Promise<number>} Number of duplicate entries removed
 */
async function removeDuplicateEntries() {
    try {
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
        const dateGroups = {};
        let duplicatesRemoved = 0;
        
        // Group entries by date
        allEntries.forEach(entry => {
            if (!dateGroups[entry.date]) {
                dateGroups[entry.date] = [];
            }
            dateGroups[entry.date].push(entry);
        });
        
        // For each date with multiple entries, keep the most recent one
        for (const date in dateGroups) {
            const entries = dateGroups[date];
            if (entries.length > 1) {
                // Sort by lastModified timestamp, keep the most recent
                entries.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
                const keepEntry = entries[0];
                const removeEntries = entries.slice(1);
                
                // Delete the older duplicates
                for (const entry of removeEntries) {
                    await window.dbFunctions.deleteFromDB('entries', entry.id);
                    duplicatesRemoved++;
                    console.log(`Removed duplicate entry for ${date}:`, entry.id);
                }
            }
        }
        
        if (duplicatesRemoved > 0) {
            window.uiManager.showNotification(`Removed ${duplicatesRemoved} duplicate entries`);
            loadEntries(); // Refresh the display
        }
        
        return duplicatesRemoved;
    } catch (error) {
        console.error('Error removing duplicate entries:', error);
        window.uiManager.showNotification('Error cleaning up duplicate entries', true);
        return 0;
    }
}

// Make functions available globally
window.entryManager = {
    saveEntry,
    clearForm,
    populateFormForEdit,
    checkAndPopulateExistingEntry,
    loadEntries,
    deleteEntry,
    initializeDate,
    removeDuplicateEntries
};