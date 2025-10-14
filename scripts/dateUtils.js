/**
 * Date Utilities Module
 * Provides date formatting and pay period calculation functions for the
 * ProfitTracker application. Handles conversion between different date formats
 * and manages pay period boundaries based on configured start dates.
 */

/**
 * Converts a Date object to ISO date string format for HTML input elements
 * 
 * @function formatDateForInput
 * @param {Date} date - JavaScript Date object to convert
 * @returns {string} Date in YYYY-MM-DD format for HTML date inputs
 * @example
 * formatDateForInput(new Date()) // "2025-10-13"
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Converts ISO date string to human-readable format for display
 * 
 * @function formatDateForDisplay
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Human-readable date with full day/month names
 * @example
 * formatDateForDisplay("2025-10-13") // "Sunday, October 13, 2025"
 */
function formatDateForDisplay(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-CA', options);
}

// Pay period configuration constants
const PAY_PERIOD_DAYS = 14; // Length of each pay period in days
const FIRST_PAY_PERIOD = new Date('2025-07-05T00:00:00'); // First known pay period start

/**
 * Calculates the start date of the current pay period
 * Uses the first known pay period date and 14-day cycles to determine
 * which pay period the current date falls within.
 * 
 * @function getCurrentPayPeriodStart
 * @returns {string} ISO date string of current pay period start
 */
function getCurrentPayPeriodStart() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight for accurate calculation
    
    // Calculate days elapsed since first known pay period
    const daysSinceFirstPeriod = Math.floor((today - FIRST_PAY_PERIOD) / (1000 * 60 * 60 * 24));
    
    // Determine how many complete pay periods have passed
    const completePeriods = Math.floor(daysSinceFirstPeriod / PAY_PERIOD_DAYS);
    
    // Calculate actual start date of current pay period
    const periodStart = new Date(FIRST_PAY_PERIOD);
    periodStart.setDate(periodStart.getDate() + completePeriods * PAY_PERIOD_DAYS);
    
    return formatDateForInput(periodStart);
}

/**
 * Calculates the end date of a pay period given its start date
 * 
 * @function getPayPeriodEnd
 * @param {string} startDate - ISO date string of pay period start
 * @returns {string} ISO date string of pay period end (14 days later)
 */
function getPayPeriodEnd(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + PAY_PERIOD_DAYS);
    return formatDateForInput(endDate);
}

/**
 * Calculates the start date of adjacent pay periods (next or previous)
 * 
 * @function getAdjacentPeriod
 * @param {string} startDate - ISO date string of reference pay period start
 * @param {number} direction - Direction to move: -1 for previous, +1 for next
 * @returns {string} ISO date string of adjacent pay period start
 */
function getAdjacentPeriod(startDate, direction) {
    const newDate = new Date(startDate);
    // Add 1 day to get to end, then add/subtract full periods
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