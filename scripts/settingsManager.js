const POINT_BASE_RATE = 6.50;
const KM_BASE_RATE = 0.88;
const PER_DIEM_BASE_RATE = 179;

async function loadSettings() {
    try {
        const settings = await window.dbFunctions.getFromDB('settings', 'rates');
        if (settings) {
            document.getElementById('point-rate').value = settings.pointRate || POINT_BASE_RATE;
            document.getElementById('km-rate').value = settings.kmRate || KM_BASE_RATE;
            document.getElementById('per-diem-rate').value = settings.perDiemRate || PER_DIEM_BASE_RATE;
            document.getElementById('gst-enabled').checked = settings.includeGST !== false;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        name: 'rates',
        pointRate: parseFloat(document.getElementById('point-rate').value) || POINT_BASE_RATE,
        kmRate: parseFloat(document.getElementById('km-rate').value) || KM_BASE_RATE,
        perDiemRate: parseFloat(document.getElementById('per-diem-rate').value) || PER_DIEM_BASE_RATE,
        includeGST: document.getElementById('gst-enabled').checked
    };
    
    try {
        await window.dbFunctions.saveToDB('settings', settings);
        window.calculations.calculateEarnings();
        window.entryManager.loadEntries();
        window.uiManager.showNotification('Settings saved');
        window.uiManager.toggleSettings();
    } catch (error) {
        console.error('Error saving settings:', error);
        window.uiManager.showNotification('Error saving settings', true);
    }
}

// Make functions available globally
window.settingsManager = {
    loadSettings,
    saveSettings
};