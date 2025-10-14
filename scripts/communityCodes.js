/**
 * Community Codes Module
 * Maps common Saskatchewan community codes to full city/town names
 * for Google Maps integration. Used to convert abbreviated location
 * codes from CSV exports into proper location names for mapping.
 */

// Community code to full name mapping for Saskatchewan locations
const COMMUNITY_CODES = {
    // Major Cities
    'PA': 'Prince Albert, SK',
    'S': 'Saskatoon, SK', 
    'Stoon': 'Saskatoon, SK', // Common alternative
    'R': 'Regina, SK',
    'RB': 'Regina Beach, SK',
    'NB': 'North Battleford, SK',
    'YK': 'Yorkton, SK',
    'MJ': 'Moose Jaw, SK',
    'SE': 'Swift Current, SK',
    'ES': 'Estevan, SK',
    'WB': 'Weyburn, SK',
    'MF': 'Melfort, SK',
    'ML': 'Melville, SK',
    'KI': 'Kindersley, SK',
    'HU': 'Humboldt, SK',
    'WC': 'White City, SK',
    'MV': 'Martensville, SK',
    'WR': 'Warman, SK',
    'BF': 'Battleford, SK',
    'RT': 'Rosetown, SK',
    'BI': 'Biggar, SK',
    'DE': 'Delisle, SK',
    'LH': 'Langham, SK',
    'DA': 'Dalmeny, SK',
    'OS': 'Osler, SK',
    'ME': 'Meadow Lake, SK',
    'TI': 'Tisdale, SK',
    'NI': 'Nipawin, SK',
    'CR': 'Carrot River, SK',
    'LR': 'La Ronge, SK',
    'AR': 'Air Ronge, SK',
    'AR': 'Arcola, SK',
    'CA': 'Carlyle, SK',
    'OX': 'Oxbow, SK',
    'AL': 'Alameda, SK',
    'KE': 'Kelvington, SK',
    'WD': 'Wadena, SK',
    'SM': 'Southey, SK',
    'GO': 'Govan, SK',
    'SI': 'Simpson, SK',
    'MO': 'Moosomin, SK',
    'ST': 'Stoughton, SK',
    'IN': 'Indian Head, SK',
    'IM': 'Imperial, SK',
    'HB': 'Hudson Bay, SK',
    'RV': 'Rose Valley, SK',
    'BL': 'Blaine Lake, SK',
    'SR': 'Spiritwood, SK',
    'UN': 'Unity, SK',
    'KV': 'Kivimaa-Moonlight Bay, SK',
    'HS': 'Horseshoe Bay, SK',
    'MM': 'Moosomin, SK',
    'LM': 'Lumsden, SK',
    'DV': 'Davidson, SK',
    'WT': 'Watrous, SK',
};

/**
 * Converts a community code to its full location name
 * 
 * @function getLocationName
 * @param {string} code - Two-letter community code (e.g., 'NB', 'R', 'S')
 * @returns {string} Full location name with province, or original code if not found
 */
function getLocationName(code) {
    const upperCode = code.toUpperCase().trim();
    return COMMUNITY_CODES[upperCode] || `${code}, SK`;
}

/**
 * Checks if a string appears to be GPS coordinates
 * 
 * @function isGPSCoordinates  
 * @param {string} location - Location string to check
 * @returns {boolean} True if string looks like GPS coordinates
 */
function isGPSCoordinates(location) {
    // Check for patterns like: "52.1234,-106.5678" or "52.1234, -106.5678"
    const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
    return coordPattern.test(location.trim());
}

/**
 * Processes a location string for Google Maps URL
 * Handles both community codes and GPS coordinates
 * 
 * @function processLocationForMaps
 * @param {string} location - Raw location string from CSV
 * @returns {string} Formatted location for Google Maps URL
 */
function processLocationForMaps(location) {
    const trimmed = location.trim();
    
    if (!trimmed) return '';
    
    // If it's GPS coordinates, return as-is
    if (isGPSCoordinates(trimmed)) {
        return trimmed;
    }
    
    // If it's a community code, convert to full name
    if (trimmed.length <= 3 && /^[A-Za-z]+$/.test(trimmed)) {
        return getLocationName(trimmed);
    }
    
    // If it already looks like a full name, add SK if not present
    if (trimmed.includes(',')) {
        return trimmed;
    } else {
        return `${trimmed}, SK`;
    }
}

// Export functions for global access
window.communityCodes = {
    getLocationName,
    isGPSCoordinates,
    processLocationForMaps,
    COMMUNITY_CODES
};