/**
 * Map Generator Module
 * Generates Google Maps URLs from CSV data with location waypoints.
 * Supports different grouping options (day, week, pay period) and handles
 * both GPS coordinates and community codes for Saskatchewan locations.
 */

async function generateMaps(entries, grouping = 'day') {
    try {
        const groups = groupEntriesByOption(entries, grouping);
        
        if (groups.length === 0) {
            window.uiManager.showNotification('No entries with locations found', true);
            return;
        }
        
        let totalMapsGenerated = 0;
        
        groups.forEach((group, groupIndex) => {
            const locations = extractLocationsFromGroup(group);
            if (locations.length === 0) {
                return;
            }
            
            const mapUrls = generateMapUrls(locations);
            window.uiManager.showNotification(mapUrls);
            
            mapUrls.forEach((url, urlIndex) => {
                setTimeout(() => {
                    window.open(url, '_blank');
                    totalMapsGenerated++;
                }, (groupIndex * mapUrls.length + urlIndex) * 500);
            });
        });
        
        const groupingLabel = grouping === 'period' ? 'pay period' : grouping;
        window.uiManager.showNotification(`Generated ${totalMapsGenerated} map(s) grouped by ${groupingLabel}`);
        
    } catch (error) {
        console.error('Error generating maps:', error);
        window.uiManager.showNotification('Error generating maps', true);
    }
}

function groupEntriesByOption(entries, grouping) {
    if (grouping === 'day') {
        const dateGroups = {};
        entries.forEach(entry => {
            if (!dateGroups[entry.date]) {
                dateGroups[entry.date] = [];
            }
            dateGroups[entry.date].push(entry);
        });
        return Object.values(dateGroups);
        
    } else if (grouping === 'week') {
        const weekGroups = {};
        entries.forEach(entry => {
            const date = new Date(entry.date);
            const weekStart = getWeekStart(date);
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weekGroups[weekKey]) {
                weekGroups[weekKey] = [];
            }
            weekGroups[weekKey].push(entry);
        });
        return Object.values(weekGroups);
        
    } else {
        return [entries];
    }
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function extractLocationsFromGroup(group) {
    const allLocations = [];
    
    group.forEach(entry => {
        if (entry.landLocations && Array.isArray(entry.landLocations)) {
            entry.landLocations.forEach(location => {
                if (location && location.trim()) {
                    allLocations.push(location.trim());
                }
            });
        }
    });
    
    // Preserve order and allow duplicates - process each location in sequence
    return allLocations
        .map(location => window.communityCodes.processLocationForMaps(location))
        .filter(location => location);
}

function generateMapUrls(locations) {
    if (locations.length === 0) return [];
    
    const maxWaypoints = 10;
    const urls = [];
    
    if (locations.length <= maxWaypoints) {
        urls.push(createMapUrl(locations));
    } else {
        let startIndex = 0;
        
        while (startIndex < locations.length) {
            let endIndex = Math.min(startIndex + maxWaypoints, locations.length);
            let routeLocations = locations.slice(startIndex, endIndex);
            
            if (endIndex < locations.length) {
                startIndex = endIndex - 1;
            } else {
                startIndex = endIndex;
            }
            
            urls.push(createMapUrl(routeLocations));
        }
    }
    
    return urls;
}

function createMapUrl(locations) {
    if (locations.length === 0) return '';
    
    const baseUrl = 'https://www.google.com/maps/dir/';
    
    const encodedLocations = locations.map(location => 
        encodeURIComponent(location.replace(/\s+/g, '+'))
    ).join('/');
    
    return baseUrl + encodedLocations + '/';
}

function getMapGrouping() {
    const checkedRadio = document.querySelector('input[name="map-grouping"]:checked');
    return checkedRadio ? checkedRadio.value : 'day';
}

async function handleGenerateMap() {
    try {
        const allEntries = await window.dbFunctions.getAllFromDB('entries');
        const payPeriodEnd = window.dateUtils.getPayPeriodEnd(window.appState.currentPayPeriodStart);
        const entries = allEntries.filter(entry => 
            entry.date >= window.appState.currentPayPeriodStart && entry.date <= payPeriodEnd
        );
        
        if (entries.length === 0) {
            window.uiManager.showNotification('No entries found for current pay period', true);
            return;
        }
        
        const grouping = getMapGrouping();
        await generateMaps(entries, grouping);
        
    } catch (error) {
        console.error('Error in handleGenerateMap:', error);
        window.uiManager.showNotification('Error generating maps', true);
    }
}

window.mapGenerator = {
    generateMaps,
    handleGenerateMap,
    getMapGrouping
};