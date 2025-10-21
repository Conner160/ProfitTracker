/**
 * Travel Sheet Generator Module
 * Handles the business logic for generating Excel travel sheets from entry data.
 * Maps daily entries to specific Excel cells and manages row insertion for large datasets.
 */

/**
 * Generates and downloads a travel sheet for the current pay period
 * Main entry point for travel sheet generation functionality
 * 
 * @async
 * @function generateTravelSheet
 * @returns {Promise<void>}
 */
async function generateTravelSheet() {
    try {
        // Show loading notification
        window.uiManager.showNotification('Generating travel sheet...', false, 0);
        
        // Get entries for current pay period
        const entries = await getPayPeriodEntries();
        
        if (entries.length === 0) {
            window.uiManager.showNotification('No entries found for this pay period', true);
            return;
        }
        
        // Filter entries to only those with locations
        const entriesWithLocations = entries.filter(entry => 
            entry.landLocations && entry.landLocations.length > 0
        );
        
        if (entriesWithLocations.length === 0) {
            window.uiManager.showNotification('No entries with locations found for this pay period', true);
            return;
        }
        
        // Load Excel template
        const workbook = await window.excelManager.loadTemplate();
        const worksheet = window.excelManager.getWorksheet(workbook);
        
        // Validate entries before processing
        const validEntries = entriesWithLocations.filter(validateEntryData);
        if (validEntries.length === 0) {
            window.uiManager.showNotification('No valid entries found with location data', true);
            return;
        }
        
        if (validEntries.length < entriesWithLocations.length) {
            console.warn(`${entriesWithLocations.length - validEntries.length} entries skipped due to invalid data`);
        }
        
        // Process and write entry data to Excel
        await writeEntriesToExcel(worksheet, validEntries);
        
        // Populate template fields with settings and calculated data (use all entries for per diem counts)
        await populateTemplateFields(worksheet, entries);
        
        // Generate filename and download
        const filename = await window.excelManager.generateFileName(window.appState.currentPayPeriodStart);
        await window.excelManager.downloadWorkbook(workbook, filename);
        
        const message = validEntries.length === entriesWithLocations.length 
            ? `Travel sheet downloaded: ${filename} (${validEntries.length} entries)`
            : `Travel sheet downloaded: ${filename} (${validEntries.length}/${entriesWithLocations.length} valid entries)`;
            
        window.uiManager.showNotification(message);
        
    } catch (error) {
        console.error('Error generating travel sheet:', error);
        
        // Provide specific error messages based on error type
        let errorMessage = 'Error generating travel sheet. ';
        if (error.message.includes('database')) {
            errorMessage += 'Unable to access your entry data. Please try again.';
        } else if (error.message.includes('ExcelJS') || error.message.includes('workbook')) {
            errorMessage += 'Excel file creation failed. Please check your browser supports file downloads.';
        } else if (error.message.includes('template')) {
            errorMessage += 'Template loading failed. Using basic template instead.';
            // Retry with basic template
            try {
                const basicWorkbook = await window.excelManager.createStructuredTemplate();
                const basicWorksheet = window.excelManager.getWorksheet(basicWorkbook);
                const entries = await getPayPeriodEntries();
                const entriesWithLocations = entries.filter(entry => 
                    entry.landLocations && entry.landLocations.length > 0
                );
                
                if (entriesWithLocations.length > 0) {
                    await writeEntriesToExcel(basicWorksheet, entriesWithLocations);
                    const filename = await window.excelManager.generateFileName(window.appState.currentPayPeriodStart);
                    await window.excelManager.downloadWorkbook(basicWorkbook, filename);
                    window.uiManager.showNotification(`Travel sheet downloaded with basic template: ${filename}`);
                    return;
                }
            } catch (retryError) {
                console.error('Retry failed:', retryError);
            }
        } else {
            errorMessage += 'Please check your entries and try again.';
        }
        
        window.uiManager.showNotification(errorMessage, true);
    }
}

/**
 * Gets all entries for the current pay period
 * 
 * @async
 * @function getPayPeriodEntries
 * @returns {Promise<Array>} Array of entry objects for the current pay period
 */
async function getPayPeriodEntries() {
    try {
        let allEntries = [];
        
        // Cloud-first approach: load from cloud (authentication is guaranteed)
        const userId = window.authManager.getCurrentUser().uid;
        
        try {
            allEntries = await window.cloudStorage.getAllEntriesFromCloud(userId);
            console.log(`📥 Travel sheet loaded ${allEntries.length} entries from cloud`);
            
        } catch (cloudError) {
            console.warn('☁️ Could not load from cloud for travel sheet, checking offline storage:', cloudError);
            
            // Fallback to offline storage if cloud fails
            try {
                const offlineEntries = await window.dbFunctions.getAllFromDB('offline_entries');
                allEntries = offlineEntries.filter(entry => entry.offlineAction === 'save');
                console.log(`💾 Travel sheet loaded ${allEntries.length} entries from offline storage`);
            } catch (offlineError) {
                console.error('Failed to load from offline storage for travel sheet:', offlineError);
                allEntries = [];
            }
        }
        
        const payPeriodEnd = window.dateUtils.getPayPeriodEnd(window.appState.currentPayPeriodStart);
        
        // Filter entries to current pay period
        const entries = allEntries.filter(entry => 
            entry.date >= window.appState.currentPayPeriodStart && 
            entry.date <= payPeriodEnd
        );
        
        // Sort by date (oldest first for chronological order in sheet)
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return entries;
    } catch (error) {
        console.error('Error getting pay period entries:', error);
        throw new Error('Failed to retrieve entries from database');
    }
}

/**
 * Writes entry data to the Excel worksheet with location transitions
 * Creates separate rows for each location-to-location movement within each day
 * Format: Date in first row, then blank dates for subsequent transitions
 * Column B: From location, Column C: To location
 * 
 * @async
 * @function writeEntriesToExcel
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to write to
 * @param {Array} entries - Array of entry objects with location data
 * @returns {Promise<void>}
 */
async function writeEntriesToExcel(worksheet, entries) {
    const START_ROW = 29;  // Starting row for data (A29, B29, C29)
    let currentRow = START_ROW;
    let totalRows = 0;
    
    // First pass: calculate total rows needed
    entries.forEach(entry => {
        if (entry.landLocations && entry.landLocations.length > 1) {
            // Each entry with locations creates (locations.length - 1) transition rows
            totalRows += entry.landLocations.length - 1;
        }
    });
    
    // Check if we need to insert additional rows beyond the default template
    const MAX_DEFAULT_ROWS = 22;  // Default template rows (A29:A50 = 22 rows)
    if (totalRows > MAX_DEFAULT_ROWS) {
        const additionalRows = totalRows - MAX_DEFAULT_ROWS;
        const insertionPoint = START_ROW + MAX_DEFAULT_ROWS;
        
        console.log(`Inserting ${additionalRows} additional rows at row ${insertionPoint} for location transitions`);
        window.excelManager.insertRows(worksheet, insertionPoint, additionalRows);
    }
    
    // Write location transitions for each entry
    entries.forEach((entry) => {
        if (!entry.landLocations || entry.landLocations.length < 2) {
            // Skip entries with fewer than 2 locations (no transitions to show)
            console.log(`Skipping entry ${entry.date} - insufficient locations:`, entry.landLocations);
            return;
        }
        
        const formattedDate = window.excelManager.formatDateForExcel(entry.date);
        console.log(`Processing entry: ${entry.date} -> ${formattedDate}, locations:`, entry.landLocations);
        let isFirstTransitionForDate = true;
        
        // Create transition rows: R→RB, RB→S, S→R
        for (let i = 0; i < entry.landLocations.length - 1; i++) {
            const fromLocation = entry.landLocations[i];
            const toLocation = entry.landLocations[i + 1];
            
            // Column A: Date only on first transition row for this entry
            if (isFirstTransitionForDate) {
                window.excelManager.writeCell(worksheet, `A${currentRow}`, formattedDate);
                isFirstTransitionForDate = false;
            }
            // Subsequent rows for the same date leave Column A blank
            
            // Column B: From location
            window.excelManager.writeCell(worksheet, `B${currentRow}`, fromLocation);
            
            // Column C: To location  
            window.excelManager.writeCell(worksheet, `C${currentRow}`, toLocation);
            
            currentRow++;
        }
    });
    
    console.log(`Wrote ${totalRows} location transition rows to Excel sheet`);
}

/**
 * Populates template fields with user settings and calculated data
 * Maps data to specific cells: B2 (tech name), B3 (tech code), B4 (GST), B5 (current date),
 * B10/B11 (date range), A15/A19 (per diem counts)
 * Data rows show location transitions: Date in col A (first transition only), From location in col B, To location in col C
 * 
 * @async
 * @function populateTemplateFields
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to write to
 * @param {Array} entries - Array of processed entries
 * @returns {Promise<void>}
 */
async function populateTemplateFields(worksheet, entries) {
    // B3: Tech Code
    const techCode = await window.settingsManager.getTechCode();
    if (techCode) {
        window.excelManager.writeCell(worksheet, 'B3', techCode);
    }
    
    // B4: GST Number (optional)
    const gstNumber = await window.settingsManager.getGstNumber();
    if (gstNumber) {
        window.excelManager.writeCell(worksheet, 'B4', gstNumber);
    }
    
    // B5: Current Date (today's date)
    const currentDate = window.excelManager.formatDateForExcel(new Date().toISOString().split('T')[0]);
    window.excelManager.writeCell(worksheet, 'B5', currentDate);
    
    if (entries.length > 0) {
        // Sort entries by date to get first and last dates
        const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // B10: First entry date
        const firstEntryDate = window.excelManager.formatDateForExcel(sortedEntries[0].date);
        window.excelManager.writeCell(worksheet, 'B10', firstEntryDate);
        
        // B11: Final entry date
        const lastEntryDate = window.excelManager.formatDateForExcel(sortedEntries[sortedEntries.length - 1].date);
        window.excelManager.writeCell(worksheet, 'B11', lastEntryDate);
        
        // Count per diem types
        const fullPerDiemCount = entries.filter(entry => entry.perDiem === 'full').length;
        const partialPerDiemCount = entries.filter(entry => entry.perDiem === 'partial').length;
        
        // A15: Count of full per diems
        if (fullPerDiemCount > 0) {
            window.excelManager.writeCell(worksheet, 'A15', fullPerDiemCount);
        }
        
        // A19: Count of partial per diems
        if (partialPerDiemCount > 0) {
            window.excelManager.writeCell(worksheet, 'A19', partialPerDiemCount);
        }
    }
    
    // B2: Tech Name (optional)
    const techName = await window.settingsManager.getTechName();
    if (techName) {
        window.excelManager.writeCell(worksheet, 'B2', techName);
    }
    
    console.log('Populated template fields with user settings and calculated data');
}

/**
 * Validates that entries have the required location data
 * 
 * @function validateEntryData
 * @param {Object} entry - Entry object to validate
 * @returns {boolean} True if entry has valid location data
 */
function validateEntryData(entry) {
    return entry && 
           entry.date && 
           entry.landLocations && 
           Array.isArray(entry.landLocations) && 
           entry.landLocations.length > 0;
}

/**
 * Handles the travel sheet generation button click
 * Provides user feedback and error handling for the generation process
 * 
 * @async
 * @function handleGenerateTravelSheet
 * @returns {Promise<void>}
 */
async function handleGenerateTravelSheet() {
    try {
        // Check if ExcelJS is loaded
        if (typeof ExcelJS === 'undefined') {
            window.uiManager.showNotification('Excel library not loaded. Please refresh the page and try again.', true);
            return;
        }
        
        // Check if tech code is set
        const techCode = await window.settingsManager.getTechCode();
        if (!techCode) {
            const proceed = confirm('Tech code is not set in settings. The file will be named with "UNKNOWN". Do you want to continue?');
            if (!proceed) return;
        }
        
        await generateTravelSheet();
    } catch (error) {
        console.error('Error in handleGenerateTravelSheet:', error);
        window.uiManager.showNotification('An unexpected error occurred while generating the travel sheet', true);
    }
}

// Make functions available globally
window.travelSheetGenerator = {
    generateTravelSheet,
    getPayPeriodEntries,
    writeEntriesToExcel,
    populateTemplateFields,
    validateEntryData,
    handleGenerateTravelSheet
};