// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }

    // Initialize database and load data
    window.dbFunctions.initDB().then(() => {
        loadSettings();
        loadEntries();
        setupEventListeners();
        updateDateDisplay();
    });
});

function setupEventListeners() {
    // Save entry button
    document.getElementById('save-entry').addEventListener('click', saveEntry);
    
    // Clear form button
    document.getElementById('clear-form').addEventListener('click', clearForm);
    
    // Settings toggle
    document.getElementById('settings-toggle').addEventListener('click', toggleSettings);
    
    // Save settings button
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
    // Calculate earnings when inputs change
    document.getElementById('points').addEventListener('input', calculateEarnings);
    document.getElementById('kms').addEventListener('input', calculateEarnings);
    document.getElementById('per-diem').addEventListener('change', calculateEarnings);
    
    // Recalculate when settings change
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

function updateDateDisplay() {
    const dateDisplay = document.getElementById('date-display');
    const today = new Date();
    dateDisplay.textContent = today.toLocaleDateString('en-CA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Set default date to today
    document.getElementById('work-date').valueAsDate = today;
}

// Add these new functions to app.js
function calculateEarnings() {
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    const perDiem = document.getElementById('per-diem').checked;
    
    // Get rates from settings
    const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.25;
    const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
    const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
    const includeGST = document.getElementById('gst-enabled').checked;
    
    // Calculate earnings
    const pointsEarnings = points * pointRate;
    const kmEarnings = kms * kmRate;
    const perDiemEarnings = perDiem ? perDiemRate : 0;
    
    // Calculate GST if enabled
    const gstMultiplier = includeGST ? 1.05 : 1;
    const totalBeforeGST = pointsEarnings + kmEarnings + perDiemEarnings;
    const totalWithGST = totalBeforeGST * gstMultiplier;
    const gstAmount = totalWithGST - totalBeforeGST;
    
    // Update the display
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
    const date = document.getElementById('work-date').value;
    const points = parseFloat(document.getElementById('points').value) || 0;
    const kms = parseFloat(document.getElementById('kms').value) || 0;
    const perDiem = document.getElementById('per-diem').checked;
    const notes = document.getElementById('notes').value;
    
    const entry = {
        date,
        points,
        kms,
        perDiem,
        notes,
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

async function loadEntries() {
    try {
        const entries = await window.dbFunctions.getAllFromDB('entries');
        const entriesList = document.getElementById('entries-list');
        
        if (entries.length === 0) {
            entriesList.innerHTML = '<p>No entries yet</p>';
            return;
        }
        
        // Sort by date (newest first)
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        entriesList.innerHTML = entries.map(entry => '
            <div class="entry-item">
                <div class="entry-header">
                    <span class="entry-date">${new Date(entry.date).toLocaleDateString()}</span>
                    <button class="delete-entry" data-id="${entry.id}">×</button>
                </div>
                <div class="entry-details">
                    <div>Points: ${entry.points} ($${(entry.points * (parseFloat(document.getElementById('point-rate').value) || 7.25).toFixed(2)})</div>
                    <div>KMs: ${entry.kms} ($${(entry.kms * (parseFloat(document.getElementById('km-rate').value) || 0.84).toFixed(2)})</div>
                    ${entry.perDiem ? `<div>Per Diem: $${(parseFloat(document.getElementById('per-diem-rate').value) || 171).toFixed(2)}</div>` : ''}
                    ${entry.notes ? '<div class="entry-notes">Notes: ${entry.notes}</div>' : ''}
                </div>
            </div>
        ').join('');
        
        // Add event listeners to delete buttons
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

async function deleteEntry(id) {
    try {
        await window.dbFunctions.deleteFromDB('entries', id);
        loadEntries();
        showNotification('Entry deleted');
    } catch (error) {
        console.error('Error deleting entry:', error);
        showNotification('Error deleting entry', true);
    }
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

function clearForm() {
    document.getElementById('points').value = '';
    document.getElementById('kms').value = '';
    document.getElementById('per-diem').checked = false;
    document.getElementById('notes').value = '';
    document.getElementById('work-date').valueAsDate = new Date();
    calculateEarnings(); // Update the display with empty values
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    settingsPanel.classList.toggle('hidden');
}

function loadSettings() {
    // This will load settings from local storage
    console.log('Loading settings...');
}

function saveSettings() {
    // This will save settings to local storage
    console.log('Saving settings...');
    toggleSettings();
}

