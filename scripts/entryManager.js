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
        const keepNew = confirm(`An entry already exists for ${window.dateUtils.formatDateForDisplay(dateInput)}.\n\n` +
                              `Existing: ${existingEntry.points} pts, ${existingEntry.kms} km\n` +
                              `New: ${points} pts, ${kms} km\n\n` +
                              `Keep new entry? (Cancel to keep old entry)`);
        
        if (!keepNew) {
            window.uiManager.showNotification('Entry not saved - kept existing entry');
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
        window.calculations.calculateEarnings();
        loadEntries();
        clearForm();
        window.uiManager.showNotification('Entry saved successfully!');
    } catch (error) {
        console.error('Error saving entry:', error);
        window.uiManager.showNotification('Error saving entry', true);
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
    window.calculations.calculateEarnings();
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
    
    window.calculations.calculateEarnings();
    
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
            
            window.calculations.calculateEarnings();
        } else {
            // Clear form fields if no existing entry (except date)
            document.getElementById('points').value = '';
            document.getElementById('kms').value = '';
            document.getElementById('per-diem').checked = false;
            document.getElementById('notes').value = '';
            document.getElementById('hotel-expense').value = '';
            document.getElementById('gas-expense').value = '';
            document.getElementById('food-expense').value = '';
            
            window.calculations.calculateEarnings();
        }
    } catch (error) {
        console.error('Error checking for existing entry:', error);
    }
}

async function loadEntries() {
    try {
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
        const payPeriodEnd = window.dateUtils.getPayPeriodEnd(window.appState.currentPayPeriodStart);
        const entries = allEntries.filter(entry => 
            entry.date >= window.appState.currentPayPeriodStart && entry.date <= payPeriodEnd
        );
        
        const entriesList = document.getElementById('entries-list');
        
        if (entries.length === 0) {
            entriesList.innerHTML = '<p>No entries for this pay period</p>';
            window.uiManager.updatePayPeriodSummary(null);
            return;
        }
        
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const payPeriodTotals = window.calculations.calculatePayPeriodTotals(entries);
        window.uiManager.updatePayPeriodSummary(payPeriodTotals);
        
        entriesList.innerHTML = entries.map(entry => {
            const pointRate = parseFloat(document.getElementById('point-rate').value) || 7.00;
            const kmRate = parseFloat(document.getElementById('km-rate').value) || 0.84;
            const perDiemRate = parseFloat(document.getElementById('per-diem-rate').value) || 171;
            const includeGST = document.getElementById('gst-enabled').checked;
            
            // Calculate total dynamically based on current settings
            const expenses = entry.expenses || {};
            const entryTotals = window.calculations.calculateEntryTotal(entry.points, entry.kms, entry.perDiem, expenses);
            
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
                        <span class="entry-date">${window.dateUtils.formatDateForDisplay(entry.date)}</span>
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

async function deleteEntry(id) {
    const confirmDelete = confirm('Are you sure you want to delete this entry?\nThis action cannot be undone.');
    if (!confirmDelete) {
        window.uiManager.showNotification('Deletion cancelled');
        return;
    }
    
    try {
        await window.dbFunctions.deleteFromDB('entries', id);
        loadEntries();
        window.uiManager.showNotification('Entry deleted');
    } catch (error) {
        console.error('Error deleting entry:', error);
        window.uiManager.showNotification('Error deleting entry', true);
    }
}

function initializeDate() {
    const today = new Date();
    const todayFormatted = window.dateUtils.formatDateForInput(today);
    document.getElementById('work-date').value = todayFormatted;
    document.getElementById('date-display').textContent = window.dateUtils.formatDateForDisplay(todayFormatted);
    
    // Check if there's already an entry for today and populate if so
    checkAndPopulateExistingEntry(todayFormatted);
}

// Make functions available globally
window.entryManager = {
    saveEntry,
    clearForm,
    populateFormForEdit,
    checkAndPopulateExistingEntry,
    loadEntries,
    deleteEntry,
    initializeDate
};