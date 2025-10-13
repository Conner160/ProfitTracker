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

// Pay period configuration
const PAY_PERIOD_DAYS = 14;
const FIRST_PAY_PERIOD = new Date('2025-07-05T00:00:00');

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

// Make functions available globally
window.dateUtils = {
    formatDateForInput,
    formatDateForDisplay,
    getCurrentPayPeriodStart,
    getPayPeriodEnd,
    getAdjacentPeriod,
    PAY_PERIOD_DAYS
};