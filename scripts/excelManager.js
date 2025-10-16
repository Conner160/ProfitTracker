/**
 * Excel Manager Module
 * Handles all Excel file operations using ExcelJS library.
 * Provides functionality for loading templates, writing data to cells,
 * inserting rows, and generating downloadable Excel files.
 */

/**
 * Creates a new Excel workbook from a template or creates a blank one
 * @async
 * @function createWorkbook
 * @param {ArrayBuffer|null} templateBuffer - Optional template file buffer
 * @returns {Promise<ExcelJS.Workbook>} The workbook instance
 */
async function createWorkbook(templateBuffer = null) {
    const workbook = new ExcelJS.Workbook();
    
    if (templateBuffer) {
        await workbook.xlsx.load(templateBuffer);
    } else {
        // Create a basic worksheet if no template provided
        const worksheet = workbook.addWorksheet('Travel Sheet');
        
        // Add basic headers if creating from scratch
        worksheet.getCell('A1').value = 'Date';
        worksheet.getCell('B1').value = 'First Location';
        worksheet.getCell('C1').value = 'Additional Locations';
    }
    
    return workbook;
}

/**
 * Loads a template file from the project or creates a basic template
 * @async
 * @function loadTemplate
 * @returns {Promise<ExcelJS.Workbook>} Workbook with template loaded
 */
async function loadTemplate() {
    try {
        // Try to load the template file from the project
        const response = await fetch('./travel-sheet-template.xlsx');
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            return await createWorkbook(buffer);
        } else {
            console.log('Template file not found, creating structured template');
            return await createStructuredTemplate();
        }
    } catch (error) {
        console.log('Error loading template, creating structured template:', error);
        return await createStructuredTemplate();
    }
}

/**
 * Creates a structured travel sheet template when no template file exists
 * @async
 * @function createStructuredTemplate
 * @returns {Promise<ExcelJS.Workbook>} Workbook with basic travel sheet structure
 */
async function createStructuredTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Travel Sheet');
    
    // Add basic headers and structure
    worksheet.getCell('A1').value = 'TRAVEL SHEET';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    
    // Add date range headers
    worksheet.getCell('A3').value = 'Pay Period:';
    worksheet.getCell('A3').font = { bold: true };
    
    // Add column headers at row 28 (just before data starts at row 29)
    worksheet.getCell('A28').value = 'Date';
    worksheet.getCell('B28').value = 'Primary Location';
    worksheet.getCell('C28').value = 'Additional Locations';
    
    // Style the headers
    ['A28', 'B28', 'C28'].forEach(cell => {
        worksheet.getCell(cell).font = { bold: true };
        worksheet.getCell(cell).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    
    // Set column widths
    worksheet.getColumn('A').width = 15; // Date column
    worksheet.getColumn('B').width = 30; // Primary location
    worksheet.getColumn('C').width = 50; // Additional locations
    
    // Pre-format the data range (A29:A50) with borders for visual structure
    for (let row = 29; row <= 50; row++) {
        ['A', 'B', 'C'].forEach(col => {
            worksheet.getCell(`${col}${row}`).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    }
    
    return workbook;
}

/**
 * Writes data to a specific cell in the worksheet
 * @function writeCell
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to write to
 * @param {string} cellAddress - Cell address (e.g., 'A1', 'B29')
 * @param {any} value - Value to write to the cell
 * @returns {void}
 */
function writeCell(worksheet, cellAddress, value) {
    const cell = worksheet.getCell(cellAddress);
    cell.value = value;
}

/**
 * Inserts new rows into the worksheet at the specified position
 * @function insertRows
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to modify
 * @param {number} startRow - Row number to start inserting at (1-based)
 * @param {number} rowCount - Number of rows to insert
 * @returns {void}
 */
function insertRows(worksheet, startRow, rowCount) {
    worksheet.spliceRows(startRow, 0, ...Array(rowCount).fill([]));
}

/**
 * Formats a date for Excel display in DD-MMM-YYYY format
 * @function formatDateForExcel
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date string (DD-MMM-YYYY)
 */
function formatDateForExcel(dateString) {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
}

/**
 * Generates filename based on tech code and pay period
 * @async
 * @function generateFileName
 * @param {string} payPeriodStart - Pay period start date (YYYY-MM-DD)
 * @returns {Promise<string>} Generated filename
 */
async function generateFileName(payPeriodStart) {
    const techCode = await window.settingsManager.getTechCode();
    const prefix = techCode || 'UNKNOWN';
    
    // Calculate pay period end
    const payPeriodEnd = window.dateUtils.getPayPeriodEnd(payPeriodStart);
    
    // Format dates for filename (dd_mm_yy)
    const startDate = new Date(payPeriodStart);
    const endDate = new Date(payPeriodEnd);
    
    const formatDateForFilename = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().substr(2);
        return `${day}_${month}_${year}`;
    };
    
    const startFormatted = formatDateForFilename(startDate);
    const endFormatted = formatDateForFilename(endDate);
    
    return `${prefix}_Travel_${startFormatted}-${endFormatted}.xlsx`;
}

/**
 * Downloads the workbook as an Excel file
 * @async
 * @function downloadWorkbook
 * @param {ExcelJS.Workbook} workbook - The workbook to download
 * @param {string} filename - The filename for the download
 * @returns {Promise<void>}
 */
async function downloadWorkbook(workbook, filename) {
    // Generate the Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create a blob and download link
    const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
}

/**
 * Gets the first worksheet from a workbook, or creates one if none exists
 * @function getWorksheet
 * @param {ExcelJS.Workbook} workbook - The workbook to get worksheet from
 * @param {string} [sheetName] - Optional specific sheet name to get
 * @returns {ExcelJS.Worksheet} The worksheet
 */
function getWorksheet(workbook, sheetName = null) {
    if (sheetName) {
        const worksheet = workbook.getWorksheet(sheetName);
        if (worksheet) return worksheet;
    }
    
    // Get first worksheet or create one if none exist
    if (workbook.worksheets.length === 0) {
        return workbook.addWorksheet('Travel Sheet');
    }
    
    return workbook.worksheets[0];
}

// Make functions available globally
window.excelManager = {
    createWorkbook,
    loadTemplate,
    createStructuredTemplate,
    writeCell,
    insertRows,
    formatDateForExcel,
    generateFileName,
    downloadWorkbook,
    getWorksheet
};