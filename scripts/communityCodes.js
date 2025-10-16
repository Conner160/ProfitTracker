/**
 * Community Codes Module
 * Maps common Saskatchewan community codes to full city/town names
 * for Google Maps integration. Used to convert abbreviated location
 * codes from CSV exports into proper location names for mapping.
 */

// Community code to full name mapping for Saskatchewan locations
const COMMUNITY_CODES = {
    'AB': 'Abbey, SK',
    'AC': 'Archerwill, SK',
    'AD': 'Aberdeen, SK',
    'AH': 'Abernethy, SK',
    'AK': 'Alsask, SK',
    'AL': 'Alameda, SK',
    'AN': 'Allan, SK',
    'AO': 'Arcola, SK',
    'AR': 'Air Ronge, SK',
    'AS': 'Asquith, SK',
    'AV': 'Avonlea, SK',
    'BA': 'Balcarres, SK',
    'BD': 'Borden, SK',
    'BE': 'Beechy, SK',
    'BF': 'Battleford, SK',
    'BG': 'Biggar, SK',
    'BH': 'Birch Hills, SK',
    'BI': 'Big River, SK',
    'BK': 'Blaine Lake, SK',
    'BL': 'Balgonie, SK',
    'BN': 'Bienfait, SK',
    'BO': 'Bruno, SK',
    'BP': 'Burstall, SK',
    'BR': 'Bredenbury, SK',
    'BT': 'Bethune, SK',
    'BU': 'Buchanan, SK',
    'BV': 'Broadview, SK',
    'CA': 'Cabri, SK',
    'CB': 'Churchbridge, SK',
    'CD': 'Carnduff, SK',
    'CE': 'Choiceland, SK',
    'CF': 'Cudworth, SK',
    'CG': 'Craik, SK',
    'CH': 'Chaplin, SK',
    'CI': 'Cochin, SK',
    'CK': 'Cut Knife, SK',
    'CL': 'Carlyle, SK',
    'CM': 'Coleville, SK',
    'CN': 'Canora, SK',
    'CO': 'Coronach, SK',
    'CP': 'Caronport, SK',
    'CQ': 'Conquest, SK',
    'CR': 'Carrot River, SK',
    'CS': 'Coppersands, SK',
    'CT': 'Codette, SK',
    'CU': 'Cupar, SK',
    'CV': 'Carivale, SK',
    'CW': 'Canwood, SK',
    'CX': 'Climax, SK',
    'CY': 'Colonsay, SK',
    'DA': 'Dalmeny, SK',
    'DB': 'Debden, SK',
    'DE': 'Delisle, SK',
    'DI': 'Dinsmore, SK',
    'DL': 'Duck Lake, SK',
    'DO': 'Dodsland, SK',
    'DU': 'Dundurn, SK',
    'DV': 'Davidson, SK',
    'DY': 'Dysart, SK',
    'EA': 'Earl Grey, SK',
    'EB': 'Elbow, SK',
    'ED': 'Edam, SK',
    'EE': 'Eastend, SK',
    'EH': 'Esterhazy, SK',
    'EL': 'Elrose, SK',
    'EN': 'Eston, SK',
    'EP': 'Emerald Park, SK',
    'ES': 'Estevan, SK',
    'ET': 'Eatonia, SK',
    'FI': 'Fillmore, SK',
    'FO': 'Foam Lake, SK',
    'FQ': 'Fort Qu\'Appelle, SK',
    'FR': 'Frontier, SK',
    'FX': 'Fox Valley, SK',
    'GA': 'Gainsborough, SK',
    'GB': 'Gravelbourg, SK',
    'GL': 'Gull Lake, SK',
    'GN': 'Glenavon, SK',
    'GO': 'Govan, SK',
    'GR': 'Grenfell, SK',
    'GS': 'Glaslyn, SK',
    'GY': 'Grayson, SK',
    'HA': 'Harris, SK',
    'HB': 'Hudson Bay, SK',
    'HD': 'Hafford, SK',
    'HE': 'Hepburn, SK',
    'HF': 'Holdfast, SK',
    'HG': 'Hague, SK',
    'HN': 'Hanley, SK',
    'HO': 'Hodgeville, SK',
    'HR': 'Herbert, SK',
    'HS': 'Horseshoe Bay, SK',
    'HU': 'Humboldt, SK',
    'IL': 'Imperial, SK',
    'IN': 'Indian Head, SK',
    'IP': 'Indian Point, SK',
    'IT': 'Ituna, SK',
    'KA': 'Kenosee Lake, SK',
    'KD': 'Kindersley, SK',
    'KE': 'Kennedy, SK',
    'KH': 'Kelliher, SK',
    'KI': 'Kincaid, SK',
    'KL': 'Kelvington, SK',
    'KM': 'Kamsack, SK',
    'KN': 'Kenaston, SK',
    'KO': 'Kinistino, SK',
    'KP': 'Kipling, SK',
    'KR': 'Kerrobert, SK',
    'KS': 'Kisbey, SK',
    'KV': 'Kivimaa-Moonlight Bay, SK',
    'KY': 'Kyle, SK',
    'LA': 'Langenburg, SK',
    'LB': 'Lashburn, SK',
    'LC': 'Lucky Lake, SK',
    'LD': 'Leader, SK',
    'LE': 'Lemberg, SK',
    'LG': 'Lang, SK',
    'LH': 'Langham, SK',
    'LI': 'Lanigan, SK',
    'LK': 'Leask, SK',
    'LL': 'Lake Lenore, SK',
    'LM': 'Lumsden, SK',
    'LN': 'Landis, SK',
    'LP': 'Lipton, SK',
    'LR': 'La Ronge, SK',
    'LS': 'Lestock, SK',
    'LT': 'Lebret, SK',
    'LU': 'Luseland, SK',
    'LV': 'Leoville, SK',
    'LW': 'Lintlaw, SK',
    'LX': 'Lampman, SK',
    'MA': 'Maryfield, SK',
    'MB': 'Mossbank, SK',
    'MC': 'Maple Creek, SK',
    'MD': 'Meadow Lake, SK',
    'ME': 'Morse, SK',
    'MF': 'Melfort, SK',
    'MG': 'Milestone, SK',
    'MH': 'Mortlach, SK',
    'MI': 'Midale, SK',
    'MK': 'Macklin, SK',
    'ML': 'Melville, SK',
    'MM': 'Moosomin, SK',
    'MN': 'Milden, SK',
    'MO': 'Manor, SK',
    'MP': 'Marshall, SK',
    'MR': 'Montmarte, SK',
    'MS': 'Maidstone, SK',
    'MT': 'Meota, SK',
    'MU': 'Muenster, SK',
    'MV': 'Martensville, SK',
    'NA': 'Naicam, SK',
    'NB': 'North Battleford, SK',
    'NE': 'Neilburg, SK',
    'NI': 'Nipawin, SK',
    'NO': 'Nokomis, SK',
    'NQ': 'Norquay, SK',
    'NU': 'Neudorf, SK',
    'OD': 'Odessa, SK',
    'OG': 'Ogema, SK',
    'OS': 'Osler, SK',
    'OU': 'Outlook, SK',
    'OX': 'Oxbox, SK',
    'PA': 'Prince Albert, SK',
    'PB': 'Pilot Butte, SK',
    'PD': 'Perdue, SK',
    'PE': 'Pelly, SK',
    'PH': 'Paradise Hill, SK',
    'PI': 'Pierceland, SK',
    'PN': 'Pense, SK',
    'PO': 'Porcupine Plain, SK',
    'PR': 'Prelate, SK',
    'PU': 'Punnichy, SK',
    'PV': 'Preeceville, SK',
    'QU': 'Qu\'Appelle, SK',
    'R': 'Regina, SK',
    'RA': 'Radisson, SK',
    'RB': 'Regina Beach, SK',
    'RD': 'Radville, SK',
    'RE': 'Redvers, SK',
    'RH': 'Rosthern, SK',
    'RL': 'Rouleau, SK',
    'RO': 'Rocanville, SK',
    'RT': 'Rosetown, SK',
    'RV': 'Rose Valley, SK',
    'RY': 'Raymore, SK',
    'S': 'Saskatoon, SK', 
    'SA': 'Strasbourg, SK',
    'SB': 'St. Brieux, SK',
    'SC': 'Saltcoats, SK',
    'SD': 'Sedley, SK',
    'SE': 'Semans, SK',
    'SG': 'Spalding, SK',
    'SH': 'Spy Hill, SK',
    'SI': 'Simpson, SK',
    'SK': 'Shellbrook, SK',
    'SL': 'Shell Lake, SK',
    'SM': 'Stockholm, SK',
    'SO': 'St. Louis, SK',
    'SP': 'Springside, SK',
    'SR': 'Spiritwood, SK',
    'SS': 'Southey, SK',
    'ST': 'Sturgis, SK',
    'Stoon': 'Saskatoon, SK', // Common alternative
    'SU': 'Stoughton, SK',
    'SV': 'Shaunovan, SK',
    'SW': 'St. Walburg, SK',
    'TH': 'Theodore, SK',
    'TI': 'Tisdale, SK',
    'TO': 'Tompkins, SK',
    'TQ': 'Torquay, SK',
    'TU': 'Turtleford, SK',
    'UN': 'Unity, SK',
    'VA': 'Vanscoy, SK',
    'VG': 'Vanguard, SK',
    'VI': 'Vibank, SK',
    'VS': 'Viscount, SK',
    'WA': 'Wakaw, SK',
    'WB': 'Weyburn, SK',
    'WC': 'White City, SK',
    'WD': 'Wadena, SK',
    'WF': 'White Fox, SK',
    'WH': 'Whitewood, SK',
    'WI': 'Windthorst, SK',
    'WK': 'Wilkie, SK',
    'WL': 'Willow Bunch, SK',
    'WO': 'Wolseley, SK',
    'WP': 'Wapella, SK',
    'WR': 'Warman, SK',
    'WS': 'Watrous, SK',
    'WT': 'Watson, SK',
    'WW': 'Wawota, SK',
    'WY': 'Wynyard, SK',
    'YG': 'Yellowgrass, SK',
    'YK': 'Yorkton, SK',
    'YU': 'Young, SK',
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