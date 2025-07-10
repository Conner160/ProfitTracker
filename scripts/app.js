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
    document.getElementById('work-date').value = formatDateForInput(today);
    document.getElementById('date-display').textContent = formatDateForDisplay(formatDateForInput(today));
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

function calculateEarnings() {
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    const perDiem = document.getElementById('per-diem').checked;
    
    const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
    const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
    const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
    const includeGST = document.getElementById('gst-enabled').checked;
    
    const pointsEarnings = points * pointRate;
    const kmEarnings = kms * kmRate;
    const perDiemEarnings = perDiem ? perDiemRate : 0;
    
    const gstMultiplier = includeGST ? 1.05 : 1;
    const totalBeforeGST = pointsEarnings + kmEarnings + perDiemEarnings;
    const totalWithGST = totalBeforeGST * gstMultiplier;
    const gstAmount = totalWithGST - totalBeforeGST;
    
    const earningsDisplay = document.getElementById('earnings-display');
    earningsDisplay.innerHTML = `
        <div><strong>Points Earnings:</strong> $${pointsEarnings.toFixed(2)} (${points} pts)</div>
        <div><strong>KM Earnings:</strong> $${kmEarnings.toFixed(2)} (${kms} km)</div>
        ${perDiem ? `<div><strong>Per Diem:</strong> $${perDiemEarnings.toFixed(2)}</div>` : ''}
        ${includeGST ? `<div><strong>GST:</strong> $${gstAmount.toFixed(2)}</div>` : ''}
        <div class="total-earnings"><strong>Total Earnings:</strong> $${totalWithGST.toFixed(2)}</div>
    `;
}

async function saveEntry() {
    const dateInput = document.getElementById('work-date').value;
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    const perDiem = document.getElementById('per-diem').checked;
    const notes = document.getElementById('notes').value;

    const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
    const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
    const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
    const includeGST = document.getElementById('gst-enabled').checked;
    const gstMultiplier = includeGST ? 1.05 : 1;

    const total = (points * pointRate + kms * kmRate + (perDiem ? perDiemRate : 0)) * gstMultiplier;

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
        total,
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
    initializeDate();
    calculateEarnings();
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
            
            return `
                <div class="entry-item">
                    <div class="entry-header">
                        <span class="entry-date">${formatDateForDisplay(entry.date)}</span>
                        <span class="entry-total">$${entry.total.toFixed(2)}</span>
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
                            <span>$${(entry.total - (entry.total / 1.05)).toFixed(2)}</span>
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
    
    entries.forEach(entry => {
        pointsTotal += entry.points || 0;
        kmsTotal += entry.kms || 0;
        if (entry.perDiem) perDiemCount++;
    });
    
    const pointsEarnings = pointsTotal * pointRate;
    const kmEarnings = kmsTotal * kmRate;
    const perDiemEarnings = perDiemCount * perDiemRate;
    const totalBeforeGST = pointsEarnings + kmEarnings + perDiemEarnings;
    const gstMultiplier = includeGST ? 1.05 : 1;
    const totalWithGST = totalBeforeGST * gstMultiplier;
    
    return {
        pointsTotal,
        kmsTotal,
        perDiemCount,
        pointsEarnings,
        kmEarnings,
        perDiemEarnings,
        totalBeforeGST,
        totalWithGST,
        gstAmount: totalWithGST - totalBeforeGST
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
        <div class="summary-total">
            <span>Pay Period Total:</span>
            <span>$${totals.totalWithGST.toFixed(2)}</span>
        </div>
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
