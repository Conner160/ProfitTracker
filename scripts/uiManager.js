function updatePayPeriodDisplay() {
    const periodDisplay = document.getElementById('current-pay-period');
    if (!periodDisplay) {
        console.error('Pay period display element not found');
        return;
    }
    
    const periodEnd = window.dateUtils.getPayPeriodEnd(window.appState.currentPayPeriodStart);
    periodDisplay.textContent = 
        `${window.dateUtils.formatDateForDisplay(window.appState.currentPayPeriodStart)} - ${window.dateUtils.formatDateForDisplay(periodEnd)}`;
}

function updatePayPeriodSummary(totals) {
    const summaryElement = document.getElementById('pay-period-summary');
    
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

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    settingsPanel.classList.toggle('hidden');
}

// Make functions available globally
window.uiManager = {
    updatePayPeriodDisplay,
    updatePayPeriodSummary,
    showNotification,
    toggleSettings
};