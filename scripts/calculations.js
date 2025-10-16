/**
 * Calculations Module
 * Handles all earnings calculations, totals computation, and financial
 * data processing for the ProfitTracker application. Manages points
 * earnings, kilometer rates, per diem, expenses, GST, and net totals.
 */

/**
 * Calculates comprehensive earnings breakdown for a single entry
 * Takes input values and current rate settings to compute all earnings
 * components including GST, expenses, and net totals. Used for both
 * live form calculations and historical entry display.
 * 
 * @function calculateEntryTotal
 * @param {number} points - Number of points earned
 * @param {number} kms - Number of kilometers driven  
 * @param {string} perDiem - Per diem type: 'full', 'partial', or 'none'
 * @param {Object} [expenses={}] - Expense breakdown object
 * @param {number} [expenses.hotel=0] - Hotel expenses
 * @param {number} [expenses.gas=0] - Gas/fuel expenses
 * @param {number} [expenses.food=0] - Food expenses
 * @returns {Object} Complete earnings breakdown with all calculated values
 */
function calculateEntryTotal(points, kms, perDiem, expenses = {}) {
    // Get current rate settings from form with fallback defaults
    const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
    const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
    const perDiemFullRate = parseFloat(document.getElementById('per-diem-full-rate').value) || 171;
    const perDiemPartialRate = parseFloat(document.getElementById('per-diem-partial-rate').value) || 46;
    const includeGST = document.getElementById('gst-enabled').checked;
    
    // Calculate base earnings for each component
    const pointsEarnings = points * pointRate;
    const kmEarnings = kms * kmRate;
    
    // Calculate per diem earnings based on type
    let perDiemEarnings = 0;
    if (perDiem === 'full') {
        perDiemEarnings = perDiemFullRate;
    } else if (perDiem === 'partial') {
        perDiemEarnings = perDiemPartialRate;
    } else {
        perDiemEarnings = 0; // 'none' or any other value
    }
    
    // Apply GST if enabled (5% tax)
    const gstMultiplier = includeGST ? 1.05 : 1;
    const totalBeforeGST = pointsEarnings + kmEarnings + perDiemEarnings;
    const grossTotal = totalBeforeGST * gstMultiplier;
    
    // Calculate total expenses and net profit
    const totalExpenses = (expenses.hotel || 0) + (expenses.gas || 0) + (expenses.food || 0);
    const netTotal = grossTotal - totalExpenses;
    
    // Return comprehensive breakdown object
    return {
        pointsEarnings,
        kmEarnings,
        perDiemEarnings,
        totalBeforeGST,
        grossTotal,
        totalExpenses,
        netTotal,
        gstAmount: grossTotal - totalBeforeGST,
        expenses
    };
}

/**
 * Calculates and displays real-time earnings for the current form
 * Reads current form values, computes totals using calculateEntryTotal,
 * and updates the earnings display with formatted breakdown including
 * GST, expenses, and net calculations.
 * 
 * @function calculateEarnings
 * @returns {void}
 */
function calculateEarnings() {
    // Extract current form values with fallback to 0
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    
    // Get selected per diem option
    const perDiemRadio = document.querySelector('input[name="per-diem"]:checked');
    const perDiem = perDiemRadio ? perDiemRadio.value : 'none';
    
    // Get expense values from form inputs
    const hotelExpense = parseFloat(document.getElementById('hotel-expense').value) || 0;
    const gasExpense = parseFloat(document.getElementById('gas-expense').value) || 0;
    const foodExpense = parseFloat(document.getElementById('food-expense').value) || 0;
    
    // Create expense object for calculation
    const expenses = {
        hotel: hotelExpense,
        gas: gasExpense,
        food: foodExpense
    };
    
    // Calculate complete earnings breakdown
    const totals = calculateEntryTotal(points, kms, perDiem, expenses);
    
    // Update the live earnings display with formatted results
    const earningsDisplay = document.getElementById('earnings-display');
    earningsDisplay.innerHTML = `
        <div><strong>Points Earnings:</strong> $${totals.pointsEarnings.toFixed(2)} (${points} pts)</div>
        <div><strong>KM Earnings:</strong> $${totals.kmEarnings.toFixed(2)} (${kms} km)</div>
        ${perDiem !== 'none' ? `<div><strong>Per Diem${perDiem === 'partial' ? ' (Partial)' : perDiem === 'full' ? ' (Full)' : ''}:</strong> $${totals.perDiemEarnings.toFixed(2)}</div>` : ''}
        ${document.getElementById('gst-enabled').checked ? `<div><strong>GST:</strong> $${totals.gstAmount.toFixed(2)}</div>` : ''}
        <div class="total-earnings"><strong>Gross Total:</strong> $${totals.grossTotal.toFixed(2)}</div>
        ${totals.totalExpenses > 0 ? `
        <div class="net-gross-summary">
            <div class="summary-row">
                <span>Hotel:</span>
                <span>-$${expenses.hotel.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Gas:</span>
                <span>-$${expenses.gas.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span>Food:</span>
                <span>-$${expenses.food.toFixed(2)}</span>
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
 * Calculates comprehensive totals for an entire pay period
 * Aggregates all entries within a pay period and computes total earnings,
 * expenses, and net profit. Used for pay period summary display.
 * 
 * @function calculatePayPeriodTotals
 * @param {Array<Object>} entries - Array of daily entry objects to sum
 * @returns {Object} Comprehensive pay period totals with all breakdowns
 */
function calculatePayPeriodTotals(entries) {
    // Get current rate settings for calculations
    const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
    const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
    const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
    const includeGST = document.getElementById('gst-enabled').checked;
    
    // Initialize accumulator variables
    let pointsTotal = 0;
    let kmsTotal = 0;
    let perDiemCount = 0;
    let totalHotelExpenses = 0;
    let totalGasExpenses = 0;
    let totalFoodExpenses = 0;
    
    // Sum all values across all entries in the pay period
    entries.forEach(entry => {
        pointsTotal += entry.points || 0;
        kmsTotal += entry.kms || 0;
        if (entry.perDiem) perDiemCount++;
        
        // Aggregate all expense categories
        const expenses = entry.expenses || {};
        totalHotelExpenses += expenses.hotel || 0;
        totalGasExpenses += expenses.gas || 0;
        totalFoodExpenses += expenses.food || 0;
    });
    
    // Calculate earnings using current rates
    const pointsEarnings = pointsTotal * pointRate;
    const kmEarnings = kmsTotal * kmRate;
    const perDiemEarnings = perDiemCount * perDiemRate;
    const totalBeforeGST = pointsEarnings + kmEarnings + perDiemEarnings;
    const gstMultiplier = includeGST ? 1.05 : 1;
    const grossTotal = totalBeforeGST * gstMultiplier;
    
    // Calculate final totals with expenses
    const totalExpenses = totalHotelExpenses + totalGasExpenses + totalFoodExpenses;
    const netTotal = grossTotal - totalExpenses;

    console.log('Pay period entries processed:', entries);
    
    return {
        pointsTotal,
        kmsTotal,
        perDiemCount,
        pointsEarnings,
        kmEarnings,
        perDiemEarnings,
        totalBeforeGST,
        grossTotal,
        totalExpenses,
        netTotal,
        gstAmount: grossTotal - totalBeforeGST,
        expenses: {
            hotel: totalHotelExpenses,
            gas: totalGasExpenses,
            food: totalFoodExpenses
        }
    };
}

// Make functions available globally
window.calculations = {
    calculateEntryTotal,
    calculateEarnings,
    calculatePayPeriodTotals
};