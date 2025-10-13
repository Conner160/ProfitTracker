// Utility function to calculate entry total based on current settings
function calculateEntryTotal(points, kms, perDiem, expenses = {}) {
    const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
    const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
    const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
    const includeGST = document.getElementById('gst-enabled').checked;
    
    const pointsEarnings = points * pointRate;
    const kmEarnings = kms * kmRate;
    const perDiemEarnings = perDiem ? perDiemRate : 0;
    
    const gstMultiplier = includeGST ? 1.05 : 1;
    const totalBeforeGST = pointsEarnings + kmEarnings + perDiemEarnings;
    const grossTotal = totalBeforeGST * gstMultiplier;
    
    // Calculate total expenses
    const totalExpenses = (expenses.hotel || 0) + (expenses.gas || 0) + (expenses.food || 0);
    const netTotal = grossTotal - totalExpenses;
    
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

function calculateEarnings() {
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    const perDiem = document.getElementById('per-diem').checked;
    
    // Get expense values
    const hotelExpense = parseFloat(document.getElementById('hotel-expense').value) || 0;
    const gasExpense = parseFloat(document.getElementById('gas-expense').value) || 0;
    const foodExpense = parseFloat(document.getElementById('food-expense').value) || 0;
    
    const expenses = {
        hotel: hotelExpense,
        gas: gasExpense,
        food: foodExpense
    };
    
    const totals = calculateEntryTotal(points, kms, perDiem, expenses);
    
    const earningsDisplay = document.getElementById('earnings-display');
    earningsDisplay.innerHTML = `
        <div><strong>Points Earnings:</strong> $${totals.pointsEarnings.toFixed(2)} (${points} pts)</div>
        <div><strong>KM Earnings:</strong> $${totals.kmEarnings.toFixed(2)} (${kms} km)</div>
        ${perDiem ? `<div><strong>Per Diem:</strong> $${totals.perDiemEarnings.toFixed(2)}</div>` : ''}
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

function calculatePayPeriodTotals(entries) {
    const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
    const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
    const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
    const includeGST = document.getElementById('gst-enabled').checked;
    
    let pointsTotal = 0;
    let kmsTotal = 0;
    let perDiemCount = 0;
    let totalHotelExpenses = 0;
    let totalGasExpenses = 0;
    let totalFoodExpenses = 0;
    
    entries.forEach(entry => {
        pointsTotal += entry.points || 0;
        kmsTotal += entry.kms || 0;
        if (entry.perDiem) perDiemCount++;
        
        // Add expenses
        const expenses = entry.expenses || {};
        totalHotelExpenses += expenses.hotel || 0;
        totalGasExpenses += expenses.gas || 0;
        totalFoodExpenses += expenses.food || 0;
    });
    
    const pointsEarnings = pointsTotal * pointRate;
    const kmEarnings = kmsTotal * kmRate;
    const perDiemEarnings = perDiemCount * perDiemRate;
    const totalBeforeGST = pointsEarnings + kmEarnings + perDiemEarnings;
    const gstMultiplier = includeGST ? 1.05 : 1;
    const grossTotal = totalBeforeGST * gstMultiplier;
    
    const totalExpenses = totalHotelExpenses + totalGasExpenses + totalFoodExpenses;
    const netTotal = grossTotal - totalExpenses;

    console.log(entries);
    
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