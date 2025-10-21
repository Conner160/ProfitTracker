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
            const dayGroups = extractLocationsFromGroup(group);
            if (dayGroups.length === 0) {
                return;
            }

            const mapUrls = generateMapUrls(dayGroups);
            
            // Determine group label
            let groupLabel = 'Maps';
            if (grouping === 'day' && group.length > 0) {
                groupLabel = `${window.dateUtils.formatDateForDisplay(group[0].date)} Maps`;
            } else if (grouping === 'week') {
                groupLabel = `Week ${groupIndex + 1} Maps`;
            } else if (grouping === 'period') {
                groupLabel = 'Pay Period Maps';
            }
            
            // Always display clickable links for all devices
            displayMapLinks(mapUrls, groupLabel);
            totalMapsGenerated += mapUrls.length;
            
            if (!isMobile) {
                // Desktop: Also auto-open tabs (in addition to showing links)
                mapUrls.forEach((url, urlIndex) => {
                    setTimeout(() => {
                        window.open(url, '_blank');
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
    const locationsByDate = {};
    
    // Group locations by date first
    group.forEach(entry => {
        if (!locationsByDate[entry.date]) {
            locationsByDate[entry.date] = [];
        }
        
        if (entry.landLocations && Array.isArray(entry.landLocations)) {
            entry.landLocations.forEach(location => {
                if (location && location.trim()) {
                    locationsByDate[entry.date].push(location.trim());
                }
            });
        }
    });
    
    // Convert to array of day objects with processed locations
    const dayGroups = Object.keys(locationsByDate)
        .sort() // Ensure chronological order
        .map(date => ({
            date,
            locations: locationsByDate[date]
                .map(location => window.communityCodes.processLocationForMaps(location))
                .filter(location => location)
        }))
        .filter(day => day.locations.length > 0);
    
    // Remove consecutive duplicates across day boundaries
    return removeConsecutiveDuplicates(dayGroups);
}

/**
 * Removes consecutive duplicate locations across day boundaries
 * @param {Array} dayGroups - Array of {date, locations} objects
 * @returns {Array} Day groups with consecutive duplicates removed
 */
function removeConsecutiveDuplicates(dayGroups) {
    if (dayGroups.length <= 1) return dayGroups;
    
    const cleanedGroups = [...dayGroups];
    
    for (let i = 1; i < cleanedGroups.length; i++) {
        const prevDay = cleanedGroups[i - 1];
        const currentDay = cleanedGroups[i];
        
        if (prevDay.locations.length > 0 && currentDay.locations.length > 0) {
            const lastLocationPrevDay = prevDay.locations[prevDay.locations.length - 1];
            const firstLocationCurrentDay = currentDay.locations[0];
            
            // Compare locations (case-insensitive and trimmed)
            if (lastLocationPrevDay.toLowerCase().trim() === firstLocationCurrentDay.toLowerCase().trim()) {
                // Remove the first location of the current day (keep the last of previous day)
                cleanedGroups[i].locations = currentDay.locations.slice(1);
            }
        }
    }
    
    // Filter out any days that now have no locations
    return cleanedGroups.filter(day => day.locations.length > 0);
}

function generateMapUrls(dayGroups) {
    if (!dayGroups || dayGroups.length === 0) return [];
    
    const maxWaypoints = 10;
    const urls = [];
    
    let currentMapLocations = [];
    
    for (let i = 0; i < dayGroups.length; i++) {
        const day = dayGroups[i];
        const dayLocations = day.locations;
        
        // If this single day has more than 10 stops, it needs its own map(s)
        if (dayLocations.length > maxWaypoints) {
            // First, finish current map if it has locations
            if (currentMapLocations.length > 0) {
                urls.push(createMapUrl(currentMapLocations));
                currentMapLocations = [];
            }
            
            // Split this day across multiple maps with overlapping waypoints
            let startIndex = 0;
            while (startIndex < dayLocations.length) {
                let endIndex = Math.min(startIndex + maxWaypoints, dayLocations.length);
                let routeLocations = dayLocations.slice(startIndex, endIndex);
                
                urls.push(createMapUrl(routeLocations));
                
                if (endIndex < dayLocations.length) {
                    startIndex = endIndex - 1; // Overlap last stop with next map's first stop
                } else {
                    startIndex = endIndex;
                }
            }
        } else {
            // Check if adding this day would exceed waypoint limit
            if (currentMapLocations.length + dayLocations.length > maxWaypoints) {
                // Finish current map and start new one
                if (currentMapLocations.length > 0) {
                    urls.push(createMapUrl(currentMapLocations));
                    currentMapLocations = [];
                }
            }
            
            // Add this day's locations to current map
            currentMapLocations.push(...dayLocations);
        }
    }
    
    // Don't forget the last map if it has locations
    if (currentMapLocations.length > 0) {
        urls.push(createMapUrl(currentMapLocations));
    }
    
    return urls;
}

function createMapUrl(locations) {
    if (locations.length === 0) return '';
    
    const baseUrl = 'https://www.google.com/maps/dir/';
    
    const encodedLocations = locations.map(location => {
        // Check if it's GPS coordinates (contains comma with numbers)
        if (window.communityCodes.isGPSCoordinates(location)) {
            // For coordinates: just remove spaces, don't add +
            return encodeURIComponent(location.replace(/\s+/g, ''));
        } else {
            // For location names: replace spaces with +
            return encodeURIComponent(location.replace(/\s+/g, '+'));
        }
    }).join('/');
    
    return baseUrl + encodedLocations + '/';
}

function getMapGrouping() {
    const checkedRadio = document.querySelector('input[name="map-grouping"]:checked');
    return checkedRadio ? checkedRadio.value : 'day';
}

async function handleGenerateMap() {
    try {
        let allEntries = [];
        
        // Cloud-first approach: load from cloud (authentication is guaranteed)
        const userId = window.authManager.getCurrentUser().uid;
        
        try {
            allEntries = await window.cloudStorage.getAllEntriesFromCloud(userId);
            console.log(`📥 Map generator loaded ${allEntries.length} entries from cloud`);
            
        } catch (cloudError) {
            console.warn('☁️ Could not load from cloud for map, checking offline storage:', cloudError);
            
            // Fallback to offline storage if cloud fails
            try {
                const offlineEntries = await window.dbFunctions.getAllFromDB('offline_entries');
                allEntries = offlineEntries.filter(entry => entry.offlineAction === 'save');
                console.log(`💾 Map generator loaded ${allEntries.length} entries from offline storage`);
            } catch (offlineError) {
                console.error('Failed to load from offline storage for map:', offlineError);
                allEntries = [];
            }
        }
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