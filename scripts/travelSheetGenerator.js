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
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
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
 * Writes entry data to the Excel worksheet
 * Maps entries to cells A29:A50 (dates), B29:B50 (first locations), C29:C50 (other locations)
 * Inserts additional rows if more than 22 entries exist
 * 
 * @async
 * @function writeEntriesToExcel
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to write to
 * @param {Array} entries - Array of entry objects with location data
 * @returns {Promise<void>}
 */
async function writeEntriesToExcel(worksheet, entries) {
    const START_ROW = 29;  // Starting row for data (A29, B29, C29)
    const MAX_DEFAULT_ROWS = 22;  // Default template rows (A29:A50 = 22 rows)
    
    // Check if we need to insert additional rows
    if (entries.length > MAX_DEFAULT_ROWS) {
        const additionalRows = entries.length - MAX_DEFAULT_ROWS;
        const insertionPoint = START_ROW + MAX_DEFAULT_ROWS;
        
        console.log(`Inserting ${additionalRows} additional rows at row ${insertionPoint}`);
        window.excelManager.insertRows(worksheet, insertionPoint, additionalRows);
    }
    
    // Write each entry to its corresponding row
    entries.forEach((entry, index) => {
        const currentRow = START_ROW + index;
        
        // Column A: Date in DD-MMM-YYYY format
        const formattedDate = window.excelManager.formatDateForExcel(entry.date);
        window.excelManager.writeCell(worksheet, `A${currentRow}`, formattedDate);
        
        // Column B: First location
        if (entry.landLocations && entry.landLocations.length > 0) {
            window.excelManager.writeCell(worksheet, `B${currentRow}`, entry.landLocations[0]);
            
            // Column C: Additional locations (comma-separated)
            if (entry.landLocations.length > 1) {
                const additionalLocations = entry.landLocations.slice(1).join(', ');
                window.excelManager.writeCell(worksheet, `C${currentRow}`, additionalLocations);
            }
        }
    });
    
    console.log(`Wrote ${entries.length} entries to Excel sheet`);
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
    validateEntryData,
    handleGenerateTravelSheet
};