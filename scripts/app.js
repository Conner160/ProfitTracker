// Date handling functions
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-CA', options);
}

function initializeDate() {
    const today = new Date();
    const todayFormatted = formatDateForInput(today);
    document.getElementById('work-date').value = todayFormatted;
    document.getElementById('date-display').textContent = formatDateForDisplay(todayFormatted);
    
    // Check if there's already an entry for today and populate if so
    checkAndPopulateExistingEntry(todayFormatted);
}

// Pay period configuration
const PAY_PERIOD_DAYS = 14;
const FIRST_PAY_PERIOD = new Date('2025-07-05T00:00:00');

// Global variable for current pay period start
let currentPayPeriodStart;

function getCurrentPayPeriodStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysSinceFirstPeriod = Math.floor((today - FIRST_PAY_PERIOD) / (1000 * 60 * 60 * 24));
    const completePeriods = Math.floor(daysSinceFirstPeriod / PAY_PERIOD_DAYS);
    const periodStart = new Date(FIRST_PAY_PERIOD);
    periodStart.setDate(periodStart.getDate() + completePeriods * PAY_PERIOD_DAYS);
    
    return formatDateForInput(periodStart);
}

function getPayPeriodEnd(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + PAY_PERIOD_DAYS);
    return formatDateForInput(endDate);
}

function getAdjacentPeriod(startDate, direction) {
    const newDate = new Date(startDate);
    newDate.setDate((newDate.getDate() + 1) + (PAY_PERIOD_DAYS * direction));
    return formatDateForInput(newDate);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registered');
                initializeApp();
            })
            .catch(err => {
                console.error('ServiceWorker registration failed:', err);
                initializeApp();
            });
    } else {
        initializeApp();
    }
});

function initializeApp() {
    // Initialize currentPayPeriodStart if not already set
    if (!currentPayPeriodStart) {
        currentPayPeriodStart = getCurrentPayPeriodStart();
    }
    
    window.dbFunctions.initDB().then(async () => {
        await loadSettings();
        setupPayPeriodControls();
        loadEntries();
        setupEventListeners();
        initializeDate();
        calculateEarnings();
    }).catch(error => {
        console.error('DB initialization failed:', error);
        showNotification('Failed to initialize database', true);
    });
}

function setupPayPeriodControls() {
    const prevBtn = document.getElementById('prev-pay-period');
    const nextBtn = document.getElementById('next-pay-period');
    
    updatePayPeriodDisplay();
    
    prevBtn.addEventListener('click', () => {
        currentPayPeriodStart = getAdjacentPeriod(currentPayPeriodStart, -1);
        updatePayPeriodDisplay();
        loadEntries();
    });
    
    nextBtn.addEventListener('click', () => {
        const nextPeriod = getAdjacentPeriod(currentPayPeriodStart, 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (new Date(nextPeriod) <= today) {
            currentPayPeriodStart = nextPeriod;
            updatePayPeriodDisplay();
            loadEntries();
        } else {
            showNotification("Cannot view future pay periods", true);
        }
    });
}

function updatePayPeriodDisplay() {
    const periodDisplay = document.getElementById('current-pay-period');
    if (!periodDisplay) {
        console.error('Pay period display element not found');
        return;
    }
    
    const periodEnd = getPayPeriodEnd(currentPayPeriodStart);
    periodDisplay.textContent = 
        `${formatDateForDisplay(currentPayPeriodStart)} - ${formatDateForDisplay(periodEnd)}`;
}

function setupEventListeners() {
    document.getElementById('save-entry').addEventListener('click', saveEntry);
    document.getElementById('clear-form').addEventListener('click', clearForm);
    document.getElementById('settings-toggle').addEventListener('click', toggleSettings);
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    document.getElementById('points').addEventListener('input', calculateEarnings);
    document.getElementById('kms').addEventListener('input', calculateEarnings);
    document.getElementById('per-diem').addEventListener('change', calculateEarnings);
    
    // Add expense input listeners
    document.getElementById('hotel-expense').addEventListener('input', calculateEarnings);
    document.getElementById('gas-expense').addEventListener('input', calculateEarnings);
    document.getElementById('food-expense').addEventListener('input', calculateEarnings);
    
    // Add date change listener for auto-population
    document.getElementById('work-date').addEventListener('change', (e) => {
        checkAndPopulateExistingEntry(e.target.value);
    });
    
    document.getElementById('point-rate').addEventListener('change', () => {
        calculateEarnings();
        loadEntries();
    });
    document.getElementById('km-rate').addEventListener('change', () => {
        calculateEarnings();
        loadEntries();
    });
    document.getElementById('per-diem-rate').addEventListener('change', () => {
        calculateEarnings();
        loadEntries();
    });
    document.getElementById('gst-enabled').addEventListener('change', () => {
        calculateEarnings();
        loadEntries();
    });
}

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

async function saveEntry() {
    const dateInput = document.getElementById('work-date').value;
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    const perDiem = document.getElementById('per-diem').checked;
    const notes = document.getElementById('notes').value;
    
    // Get expense values
    const hotelExpense = parseFloat(document.getElementById('hotel-expense').value) || 0;
    const gasExpense = parseFloat(document.getElementById('gas-expense').value) || 0;
    const foodExpense = parseFloat(document.getElementById('food-expense').value) || 0;
    
    const expenses = {
        hotel: hotelExpense,
        gas: gasExpense,
        food: foodExpense
    };

    const existingEntries = await window.dbFunctions.getAllFromDB('entries');
    const existingEntry = existingEntries.find(entry => entry.date === dateInput);

    if (existingEntry) {
        const keepNew = confirm(`An entry already exists for ${formatDateForDisplay(dateInput)}.\n\n` +
                              `Existing: ${existingEntry.points} pts, ${existingEntry.kms} km\n` +
                              `New: ${points} pts, ${kms} km\n\n` +
                              `Keep new entry? (Cancel to keep old entry)`);
        
        if (!keepNew) {
            showNotification('Entry not saved - kept existing entry');
            return;
        }

        await window.dbFunctions.deleteFromDB('entries', existingEntry.id);
    }

    const entry = {
        date: dateInput,
        points,
        kms,
        perDiem,
        notes,
        expenses,
        timestamp: new Date().getTime()
    };

    try {
        await window.dbFunctions.saveToDB('entries', entry);
        calculateEarnings();
        loadEntries();
        clearForm();
        showNotification('Entry saved successfully!');
    } catch (error) {
        console.error('Error saving entry:', error);
        showNotification('Error saving entry', true);
    }
}

function clearForm() {
    document.getElementById('points').value = '';
    document.getElementById('kms').value = '';
    document.getElementById('per-diem').checked = false;
    document.getElementById('notes').value = '';
    
    // Clear expense fields
    document.getElementById('hotel-expense').value = '';
    document.getElementById('gas-expense').value = '';
    document.getElementById('food-expense').value = '';
    
    initializeDate();
    calculateEarnings();
}

function populateFormForEdit(entry) {
    document.getElementById('work-date').value = entry.date;
    document.getElementById('points').value = entry.points;
    document.getElementById('kms').value = entry.kms;
    document.getElementById('per-diem').checked = entry.perDiem;
    document.getElementById('notes').value = entry.notes || '';
    
    // Populate expense fields
    const expenses = entry.expenses || {};
    document.getElementById('hotel-expense').value = expenses.hotel || '';
    document.getElementById('gas-expense').value = expenses.gas || '';
    document.getElementById('food-expense').value = expenses.food || '';
    
    calculateEarnings();
    
    // Scroll to the form for better user experience
    document.getElementById('daily-entry').scrollIntoView({ behavior: 'smooth' });
}

async function checkAndPopulateExistingEntry(date) {
    try {
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
        const existingEntry = allEntries.find(entry => entry.date === date);
        
        if (existingEntry) {
            // Populate form with existing entry data, but don't scroll
            document.getElementById('points').value = existingEntry.points;
            document.getElementById('kms').value = existingEntry.kms;
            document.getElementById('per-diem').checked = existingEntry.perDiem;
            document.getElementById('notes').value = existingEntry.notes || '';
            
            // Populate expense fields
            const expenses = existingEntry.expenses || {};
            document.getElementById('hotel-expense').value = expenses.hotel || '';
            document.getElementById('gas-expense').value = expenses.gas || '';
            document.getElementById('food-expense').value = expenses.food || '';
            
            calculateEarnings();
        } else {
            // Clear form fields if no existing entry (except date)
            document.getElementById('points').value = '';
            document.getElementById('kms').value = '';
            document.getElementById('per-diem').checked = false;
            document.getElementById('notes').value = '';
            document.getElementById('hotel-expense').value = '';
            document.getElementById('gas-expense').value = '';
            document.getElementById('food-expense').value = '';
            
            calculateEarnings();
        }
    } catch (error) {
        console.error('Error checking for existing entry:', error);
    }
}

async function loadEntries() {
    try {
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
        const payPeriodEnd = getPayPeriodEnd(currentPayPeriodStart);
        const entries = allEntries.filter(entry => 
            entry.date >= currentPayPeriodStart && entry.date <= payPeriodEnd
        );
        
        const entriesList = document.getElementById('entries-list');
        
        if (entries.length === 0) {
            entriesList.innerHTML = '<p>No entries for this pay period</p>';
            updatePayPeriodSummary(null);
            return;
        }
        
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const payPeriodTotals = calculatePayPeriodTotals(entries);
        updatePayPeriodSummary(payPeriodTotals);
        
        entriesList.innerHTML = entries.map(entry => {
            const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
            const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
            const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
            const includeGST = document.getElementById('gst-enabled').checked;
            
            // Calculate total dynamically based on current settings
            const expenses = entry.expenses || {};
            const entryTotals = calculateEntryTotal(entry.points, entry.kms, entry.perDiem, expenses);
            
            // Prepare expense data for editing
            const expenseData = JSON.stringify(expenses).replace(/"/g, '&quot;');
            
            return `
                <div class="entry-item editable-entry" 
                     data-id="${entry.id}"
                     data-date="${entry.date}" 
                     data-points="${entry.points}" 
                     data-kms="${entry.kms}" 
                     data-per-diem="${entry.perDiem}" 
                     data-notes="${entry.notes || ''}"
                     data-expenses="${expenseData}">
                    <div class="entry-header">
                        <span class="entry-date">${formatDateForDisplay(entry.date)}</span>
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
                        ${entry.perDiem ? `
                        <div class="entry-row">
                            <span>Per Diem:</span>
                            <span>$${perDiemRate.toFixed(2)}</span>
                        </div>` : ''}
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
                
                const entryData = {
                    id: parseInt(entryElement.dataset.id),
                    date: entryElement.dataset.date,
                    points: parseFloat(entryElement.dataset.points),
                    kms: parseFloat(entryElement.dataset.kms),
                    perDiem: entryElement.dataset.perDiem === 'true',
                    notes: entryElement.dataset.notes,
                    expenses: expenses
                };
                populateFormForEdit(entryData);
            });
        });
    } catch (error) {
        console.error('Error loading entries:', error);
    }
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

async function deleteEntry(id) {
    const confirmDelete = confirm('Are you sure you want to delete this entry?\nThis action cannot be undone.');
    if (!confirmDelete) {
        showNotification('Deletion cancelled');
        return;
    }
    
    try {
        await window.dbFunctions.deleteFromDB('entries', id);
        loadEntries();
        showNotification('Entry deleted');
    } catch (error) {
        console.error('Error deleting entry:', error);
        showNotification('Error deleting entry', true);
    }
}

async function loadSettings() {
    try {
        const settings = await window.dbFunctions.getFromDB('settings', 'rates');
        if (settings) {
            document.getElementById('point-rate').value = settings.pointRate || 7.00;
            document.getElementById('km-rate').value = settings.kmRate || 0.84;
            document.getElementById('per-diem-rate').value = settings.perDiemRate || 171;
            document.getElementById('gst-enabled').checked = settings.includeGST !== false;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        name: 'rates',
        pointRate: parseFloat(document.getElementById('point-rate').value) || 7.00,
        kmRate: parseFloat(document.getElementById('km-rate').value) || 0.84,
        perDiemRate: parseFloat(document.getElementById('per-diem-rate').value) || 171,
        includeGST: document.getElementById('gst-enabled').checked
    };
    
    try {
        await window.dbFunctions.saveToDB('settings', settings);
        calculateEarnings();
        loadEntries();
        showNotification('Settings saved');
        toggleSettings();
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', true);
    }
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    settingsPanel.classList.toggle('hidden');
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
