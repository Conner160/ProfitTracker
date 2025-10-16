/**
 * UI Manager Module
 * Handles all user interface updates, display formatting, notifications,
 * and visual state management for the ProfitTracker application. Manages
 * pay period displays, summary presentations, and user feedback.
 */

/**
 * Updates the pay period display header with current period dates
 * Retrieves the current pay period start from app state, calculates
 * the end date, and updates the UI element with formatted date range.
 * 
 * @function updatePayPeriodDisplay
 * @returns {void}
 */
function updatePayPeriodDisplay() {
    const periodDisplay = document.getElementById('current-pay-period');
    if (!periodDisplay) {
        console.error('Pay period display element not found');
        return;
    }
    
    // Calculate end date and format both dates for display
    const periodEnd = window.dateUtils.getPayPeriodEnd(window.appState.currentPayPeriodStart);
    periodDisplay.textContent = 
        `${window.dateUtils.formatDateForDisplay(window.appState.currentPayPeriodStart)} - ${window.dateUtils.formatDateForDisplay(periodEnd)}`;
}

/**
 * Updates the pay period summary display with comprehensive totals breakdown
 * Takes calculated totals object and generates formatted HTML showing all
 * earnings categories, expenses, and net profit. Handles both empty periods
 * and periods with data, including conditional GST display.
 * 
 * @function updatePayPeriodSummary
 * @param {Object|null} totals - Complete totals object from calculatePayPeriodTotals or null
 * @param {number} totals.pointsTotal - Total points earned in period
 * @param {number} totals.pointsEarnings - Total earnings from points
 * @param {number} totals.kmsTotal - Total kilometers driven
 * @param {number} totals.kmEarnings - Total earnings from kilometers
 * @param {number} totals.perDiemCount - Number of per diem days
 * @param {number} totals.perDiemEarnings - Total per diem earnings
 * @param {number} totals.grossTotal - Total earnings including GST
 * @param {number} totals.totalExpenses - Sum of all expenses
 * @param {number} totals.netTotal - Final profit after expenses
 * @param {Object} totals.expenses - Breakdown of expense categories
 * @returns {void}
 */
function updatePayPeriodSummary(totals) {
    const summaryElement = document.getElementById('pay-period-summary');
    
    // Handle empty pay periods
    if (!totals) {
        summaryElement.innerHTML = '<p>No entries for this pay period</p>';
        return;
    }
    
    const includeGST = document.getElementById('gst-enabled').checked;
    
    summaryElement.innerHTML = `
        <h3>Pay Period Summary</h3>
        <div class="summary-row">
            <span>Total Points:</span>
            <span>${totals.pointsTotal} ($${totals.pointsEarnings.toFixed(2)})</span>
        </div>
        <div class="summary-row">
            <span>Total Kilometers:</span>
            <span>${totals.kmsTotal} ($${totals.kmEarnings.toFixed(2)})</span>
        </div>
        <div class="summary-row">
            <span>Per Diems:</span>
            <span>${totals.perDiemCount} ($${totals.perDiemEarnings.toFixed(2)})</span>
        </div>
        ${includeGST ? `
        <div class="summary-row">
            <span>GST:</span>
            <span>$${totals.gstAmount.toFixed(2)}</span>
        </div>` : ''}
        <div class="summary-row">
            <span><strong>Gross Total:</strong></span>
            <span><strong>$${totals.grossTotal.toFixed(2)}</strong></span>
        </div>
        ${totals.totalExpenses > 0 ? `
        <div class="net-gross-summary">
            <div class="summary-row">
                <span>Hotel Expenses:</span>
                <span>-$${totals.expenses.hotel.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Gas Expenses:</span>
                <span>-$${totals.expenses.gas.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Food Expenses:</span>
                <span>-$${totals.expenses.food.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Total Expenses:</span>
                <span>-$${totals.totalExpenses.toFixed(2)}</span>
            </div>
            <div class="summary-row net-total">
                <span><strong>Net Total:</strong></span>
                <span><strong>$${totals.netTotal.toFixed(2)}</strong></span>
            </div>
        </div>` : ''}
    `;
}

/**
 * Displays a temporary notification message to the user
 * Creates a styled notification element that appears briefly then
 * auto-removes. Supports both success (green) and error (red) styling
 * based on message type. Used throughout app for user feedback.
 * 
 * @function showNotification
 * @param {string} message - Text message to display to user
 * @param {boolean} [isError=false] - Whether to style as error (red) vs success (green)
 * @returns {void}
 */
function showNotification(message, isError = false) {
    // Create notification element with appropriate styling
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/**
 * Toggles the visibility of the settings panel
 * Shows or hides the settings panel by toggling the 'hidden' CSS class.
 * Called when user clicks the settings toggle button to access rate
 * configuration and other app preferences. Also scrolls to settings when opened.
 * 
 * @function toggleSettings
 * @returns {void}
 */
function toggleSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    const isCurrentlyHidden = settingsPanel.classList.contains('hidden');
    
    settingsPanel.classList.toggle('hidden');
    
    // If we just opened the settings (was hidden, now visible), scroll to it
    if (isCurrentlyHidden) {
        setTimeout(() => {
            settingsPanel.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        }, 100); // Small delay to ensure the panel is visible before scrolling
    }
}

// Make functions available globally
window.uiManager = {
    updatePayPeriodDisplay,
    updatePayPeriodSummary,
    showNotification,
    toggleSettings
};