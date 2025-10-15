/**
 * Map Generator Module
 * Generates Google Maps URLs from CSV data with location waypoints.
 * Supports different grouping options (day, week, pay period) and handles
 * both GPS coordinates and community codes for Saskatchewan locations.
 */

/**
 * Detects if user is on mobile device
 * @returns {boolean} True if mobile device detected
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768) ||
           ('ontouchstart' in window);
}

/**
 * Creates and displays clickable map links in the UI
 * @param {Array<string>} urls - Array of Google Maps URLs
 * @param {string} groupLabel - Label for the group (day/week/period)
 */
function displayMapLinks(urls, groupLabel) {
    // Find or create map links container
    let linksContainer = document.getElementById('map-links-container');
    if (!linksContainer) {
        linksContainer = document.createElement('div');
        linksContainer.id = 'map-links-container';
        linksContainer.innerHTML = '<h3>Generated Map Links</h3>';
        // Insert after the map generation section
        const mapSection = document.getElementById('map-generation-section');
        mapSection.parentNode.insertBefore(linksContainer, mapSection.nextSibling);
    }
    
    // Create group container
    const groupDiv = document.createElement('div');
    groupDiv.className = 'map-group';
    groupDiv.innerHTML = `<h4>${groupLabel}</h4>`;
    
    urls.forEach((url, index) => {
        const linkDiv = document.createElement('div');
        linkDiv.className = 'map-link-item';
        
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `Map ${index + 1}`;
        link.className = 'map-link';
        
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.className = 'copy-link-btn';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
                window.uiManager.showNotification('Map URL copied!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                window.uiManager.showNotification('Map URL copied!');
            });
        };
        
        linkDiv.appendChild(link);
        linkDiv.appendChild(copyBtn);
        groupDiv.appendChild(linkDiv);
    });
    
    linksContainer.appendChild(groupDiv);
}

async function generateMaps(entries, grouping = 'day') {
    try {
        const groups = groupEntriesByOption(entries, grouping);
        
        if (groups.length === 0) {
            window.uiManager.showNotification('No entries with locations found', true);
            return;
        }
        
        let totalMapsGenerated = 0;
        
        const isMobile = isMobileDevice();
        
        // Clear previous map links if they exist
        const existingContainer = document.getElementById('map-links-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        groups.forEach((group, groupIndex) => {
            const locations = extractLocationsFromGroup(group);
            if (locations.length === 0) {
                return;
            }

            const mapUrls = generateMapUrls(locations);
            
            // Determine group label
            let groupLabel = 'Maps';
            if (grouping === 'day' && group.length > 0) {
                groupLabel = `${window.dateUtils.formatDateForDisplay(group[0].date)} Maps`;
            } else if (grouping === 'week') {
                groupLabel = `Week ${groupIndex + 1} Maps`;
            } else if (grouping === 'period') {
                groupLabel = 'Pay Period Maps';
            }
            
            if (isMobile) {
                // Mobile: Display clickable links
                displayMapLinks(mapUrls, groupLabel);
                totalMapsGenerated += mapUrls.length;
            } else {
                // Desktop: Open in new tabs
                mapUrls.forEach((url, urlIndex) => {
                    setTimeout(() => {
                        window.open(url, '_blank');
                        totalMapsGenerated++;
                    }, (groupIndex * mapUrls.length + urlIndex) * 500);
                });
            }
        });        const groupingLabel = grouping === 'period' ? 'pay period' : grouping;
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