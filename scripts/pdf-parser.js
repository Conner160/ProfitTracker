// PDF Parser for Work Orders
// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFParser {
    constructor() {
        this.workOrders = [];
    }

    /**
     * Parse PDF file and extract work order data
     * @param {File} file - PDF file to parse
     * @returns {Promise<Array>} Array of work orders grouped by date
     */
    async parsePDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            let allText = '';
            
            // Extract text from all pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                allText += pageText + '\n';
            }
            
            // Verify PDF authenticity
            if (!this.verifyPDFFormat(allText)) {
                throw new Error('Invalid PDF format. Expected work order report from myaccess.ca');
            }
            
            // Parse work orders from text
            const workOrders = this.parseWorkOrders(allText);
            
            // Group by date and calculate daily totals
            const dailyEntries = this.groupByDate(workOrders);
            
            return dailyEntries;
            
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw error;
        }
    }

    /**
     * Verify PDF format by checking for expected footer URL
     * @param {string} text - Full PDF text content
     * @returns {boolean} True if PDF format is valid
     */
    verifyPDFFormat(text) {
        // Check for the specific URL pattern in footer
        const expectedUrlPattern = /https:\/\/account\.myaccess\.ca\/TRA\/WO_report\.php/;
        return expectedUrlPattern.test(text);
    }

    /**
     * Parse work orders from PDF text content
     * @param {string} text - PDF text content
     * @returns {Array} Array of parsed work orders
     */
    parseWorkOrders(text) {
        const workOrders = [];
        
        // Split text into lines and look for tabular data
        const lines = text.split('\n');
        let isInDataSection = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Look for work order data patterns
            // Assuming work orders start with a work order number pattern
            if (this.isWorkOrderLine(line)) {
                const workOrder = this.parseWorkOrderLine(line, lines, i);
                if (workOrder) {
                    workOrders.push(workOrder);
                }
            }
        }
        
        return workOrders;
    }

    /**
     * Check if a line contains work order data
     * @param {string} line - Text line to check
     * @returns {boolean} True if line contains work order data
     */
    isWorkOrderLine(line) {
        // Look for patterns that indicate a work order line
        // This is a simplified pattern - may need adjustment based on actual PDF format
        const workOrderPattern = /^\d+\s+\d{4}-\d{2}-\d{2}/; // Starts with number followed by date
        return workOrderPattern.test(line);
    }

    /**
     * Parse a single work order line
     * @param {string} line - Work order line text
     * @param {Array} allLines - All lines for context
     * @param {number} lineIndex - Current line index
     * @returns {Object} Parsed work order object
     */
    parseWorkOrderLine(line, allLines, lineIndex) {
        try {
            // Split the line by whitespace to extract fields
            const parts = line.split(/\s+/);
            
            if (parts.length < 8) {
                return null; // Not enough data
            }
            
            const workOrder = {
                woNumber: parts[0],
                date: parts[1],
                time: parts[2] || 'AV',
                subno: parts[3] || '',
                phone: parts[4] || '',
                address: parts[5] || '',
                cc: parts[6] || '',
                doneFlag: parts[7] || '',
                totalPnts: parseFloat(parts[8]) || 0,
                activityCodes: parts[9] || '',
                reportedCodes: parts[10] || '',
                solutionCodes: parts[11] || '',
                notes: parts.slice(12).join(' ') || ''
            };
            
            // Adjust points for service calls with specific solution codes
            workOrder.adjustedPoints = this.calculateAdjustedPoints(
                workOrder.totalPnts, 
                workOrder.solutionCodes, 
                workOrder.reportedCodes
            );
            
            return workOrder;
            
        } catch (error) {
            console.error('Error parsing work order line:', error);
            return null;
        }
    }

    /**
     * Calculate adjusted points based on solution codes
     * @param {number} totalPoints - Original total points
     * @param {string} solutionCodes - Solution codes
     * @param {string} reportedCodes - Reported codes
     * @returns {number} Adjusted points
     */
    calculateAdjustedPoints(totalPoints, solutionCodes, reportedCodes) {
        // Service calls with solution codes 4D, 4E, 4F, 4G should be 3 points instead of 6
        const reducedPointsCodes = ['4D', '4E', '4F', '4G'];
        
        // Check if this is a service call (has reported codes but no activity codes)
        const isServiceCall = reportedCodes && !solutionCodes;
        
        if (isServiceCall && totalPoints === 6) {
            // Check if solution code is one that reduces points
            for (const code of reducedPointsCodes) {
                if (solutionCodes && solutionCodes.includes(code)) {
                    return 3;
                }
            }
        }
        
        return totalPoints;
    }

    /**
     * Group work orders by date and calculate daily totals
     * @param {Array} workOrders - Array of work orders
     * @returns {Array} Array of daily entries
     */
    groupByDate(workOrders) {
        const dailyEntries = new Map();
        
        workOrders.forEach(workOrder => {
            const date = workOrder.date;
            
            if (!dailyEntries.has(date)) {
                dailyEntries.set(date, {
                    date: date,
                    points: 0,
                    workOrders: []
                });
            }
            
            const dailyEntry = dailyEntries.get(date);
            dailyEntry.points += workOrder.adjustedPoints;
            dailyEntry.workOrders.push(workOrder);
        });
        
        // Convert map to array and sort by date
        return Array.from(dailyEntries.values()).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
    }

    /**
     * Preview parsed data in a readable format
     * @param {Array} dailyEntries - Parsed daily entries
     * @returns {string} HTML preview of the data
     */
    generatePreview(dailyEntries) {
        if (!dailyEntries || dailyEntries.length === 0) {
            return '<p>No work orders found in PDF</p>';
        }
        
        let html = '<h3>Parsed Work Orders</h3>';
        
        dailyEntries.forEach(entry => {
            html += `
                <div class="preview-day">
                    <h4>${this.formatDate(entry.date)} - ${entry.points} points</h4>
                    <ul>
            `;
            
            entry.workOrders.forEach(wo => {
                html += `
                    <li>
                        WO#${wo.woNumber} - ${wo.adjustedPoints} pts 
                        ${wo.time !== 'AV' ? `(${wo.time})` : ''}
                        ${wo.solutionCodes ? `[${wo.solutionCodes}]` : ''}
                    </li>
                `;
            });
            
            html += '</ul></div>';
        });
        
        return html;
    }

    /**
     * Format date for display
     * @param {string} dateStr - Date string in YYYY-MM-DD format
     * @returns {string} Formatted date string
     */
    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-CA', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
}

// Make PDFParser available globally
window.PDFParser = PDFParser;