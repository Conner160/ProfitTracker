/**
 * Location Manager Module
 * Handles land location management with drag-and-drop functionality.
 * Supports both desktop drag-and-drop and mobile touch-based dragging
 * with long-press activation. Manages location creation, deletion,
 * reordering, and form integration for daily entries.
 */

/**
 * Prompts user to add a new land location and creates draggable element
 * Shows input prompt, creates new location element with drag functionality,
 * and updates location IDs. Called when user clicks the "Add Location" button.
 * 
 * @function addLandLocation
 * @returns {void}
 */
function addLandLocation() {
    const location = prompt('Enter land location:');
    
    if (location && location.trim() !== '') {
        const landlocsDiv = document.getElementById('landlocs');
        const locationElement = document.createElement('p');
        locationElement.classList.add("landloc_p");
        locationElement.textContent = location.trim();
        
        // Enable drag-and-drop functionality
        makeDraggable(locationElement);
        
        landlocsDiv.appendChild(locationElement);
        
        // Update sequential IDs after adding new location
        updateLocationIds();
    }
}

/**
 * Deletes a land location after user confirmation
 * Shows confirmation dialog and removes the location element from DOM.
 * Updates remaining location IDs to maintain sequential order.
 * 
 * @function deleteLocation
 * @param {string} id - Element ID of the location to delete
 * @returns {void}
 */
function deleteLocation(id) {
    if (confirm("Delete this location?")) {
        document.getElementById(id).remove();
        // Update all IDs after deletion to maintain sequence
        updateLocationIds();
    }
}

/**
 * Adds modern drag-and-drop functionality to a location element
 * Mobile-first approach with dedicated drag handles and smooth animations
 * 
 * @function makeDraggable
 * @param {HTMLElement} element - The location element to make draggable
 * @returns {void}
 */
function makeDraggable(element) {
    // Create drag handle and delete button
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '☰'; // hamburger menu icon
    dragHandle.setAttribute('aria-label', 'Drag to reorder');
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.innerHTML = '×';
    deleteButton.setAttribute('aria-label', 'Delete location');
    deleteButton.type = 'button';
    
    // Wrap content and add controls
    const content = element.textContent;
    element.innerHTML = '';
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'location-content';
    contentSpan.textContent = content;
    
    element.appendChild(dragHandle);
    element.appendChild(contentSpan);
    element.appendChild(deleteButton);
    
    // Add delete functionality
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        deleteLocation(element.id);
    });
    
    // Make drag handle the draggable area
    setupDragHandle(element, dragHandle);
}

// Modern drag-and-drop state management
let dragState = {
    element: null,           // Element being dragged
    handle: null,           // Drag handle element
    isDragging: false,      // Whether actively dragging
    startX: 0,             // Initial X coordinate
    startY: 0,             // Initial Y coordinate
    currentX: 0,           // Current X coordinate
    currentY: 0,           // Current Y coordinate
    offsetX: 0,            // Offset from touch point to element edge
    offsetY: 0,            // Offset from touch point to element edge
    placeholder: null,      // Placeholder element
    container: null,        // Container element
    originalIndex: 0,       // Original position for restoration
    scrolling: false        // Whether container is being scrolled
};

/**
 * Sets up drag functionality for a drag handle
 * @param {HTMLElement} element - The location element
 * @param {HTMLElement} handle - The drag handle
 */
function setupDragHandle(element, handle) {
    // Touch events (mobile-first)
    handle.addEventListener('touchstart', handleTouchStart, { passive: false });
    handle.addEventListener('touchmove', handleTouchMove, { passive: false });
    handle.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Mouse events (desktop fallback)
    handle.addEventListener('mousedown', handleMouseStart);
    
    // Prevent text selection
    handle.addEventListener('selectstart', e => e.preventDefault());
    handle.addEventListener('dragstart', e => e.preventDefault());
}

/**
 * Handles touch start - immediate drag activation
 */
function handleTouchStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const element = e.target.closest('.landloc_p');
    const container = document.getElementById('landlocs');
    
    if (!element || !container) return;
    
    startDrag(element, e.target, touch.clientX, touch.clientY, container);
    
    // Add haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
}

/**
 * Handles mouse start for desktop
 */
function handleMouseStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const element = e.target.closest('.landloc_p');
    const container = document.getElementById('landlocs');
    
    if (!element || !container) return;
    
    startDrag(element, e.target, e.clientX, e.clientY, container);
    
    // Add mouse move and up listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseEnd);
}

/**
 * Starts drag operation
 */
function startDrag(element, handle, x, y, container) {
    dragState.element = element;
    dragState.handle = handle;
    dragState.container = container;
    dragState.isDragging = true;
    dragState.startX = x;
    dragState.startY = y;
    dragState.currentX = x;
    dragState.currentY = y;
    
    // Store original index
    const siblings = Array.from(container.children);
    dragState.originalIndex = siblings.indexOf(element);
    
    // Calculate offset from touch/click point to element corner
    const rect = element.getBoundingClientRect();
    dragState.offsetX = x - rect.left;
    dragState.offsetY = y - rect.top;
    
    // Create placeholder
    dragState.placeholder = document.createElement('div');
    dragState.placeholder.className = 'drag-placeholder';
    dragState.placeholder.style.height = rect.height + 'px';
    
    // Insert placeholder and start visual drag
    element.parentNode.insertBefore(dragState.placeholder, element);
    element.classList.add('dragging');
    
    // Position element absolutely
    element.style.position = 'fixed';
    element.style.left = (rect.left) + 'px';
    element.style.top = (rect.top) + 'px';
    element.style.width = rect.width + 'px';
    element.style.zIndex = '1000';
    element.style.pointerEvents = 'none';
    
    // Prevent page scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
}

/**
 * Handles touch move during drag
 */
function handleTouchMove(e) {
    if (!dragState.isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    dragState.currentX = touch.clientX;
    dragState.currentY = touch.clientY;
    
    updateDragPosition();
    updateDropTarget();
}

/**
 * Handles mouse move during drag
 */
function handleMouseMove(e) {
    if (!dragState.isDragging) return;
    
    e.preventDefault();
    
    dragState.currentX = e.clientX;
    dragState.currentY = e.clientY;
    
    updateDragPosition();
    updateDropTarget();
}

/**
 * Updates drag element position
 */
function updateDragPosition() {
    if (!dragState.element) return;
    
    const newX = dragState.currentX - dragState.offsetX;
    const newY = dragState.currentY - dragState.offsetY;
    
    dragState.element.style.left = newX + 'px';
    dragState.element.style.top = newY + 'px';
}

/**
 * Updates drop target position
 */
function updateDropTarget() {
    if (!dragState.container || !dragState.placeholder) return;
    
    const afterElement = getDropTarget(dragState.container, dragState.currentY);
    
    if (afterElement === null) {
        dragState.container.appendChild(dragState.placeholder);
    } else if (afterElement !== dragState.placeholder) {
        dragState.container.insertBefore(dragState.placeholder, afterElement);
    }
}

/**
 * Handles touch end
 */
function handleTouchEnd(e) {
    if (!dragState.isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    endDrag();
}

/**
 * Handles mouse end
 */
function handleMouseEnd(e) {
    if (!dragState.isDragging) return;
    
    e.preventDefault();
    
    // Remove mouse listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseEnd);
    
    endDrag();
}

/**
 * Ends drag operation and cleans up
 */
function endDrag() {
    if (!dragState.element || !dragState.placeholder) return;
    
    // Reset element styles
    dragState.element.classList.remove('dragging');
    dragState.element.style.position = '';
    dragState.element.style.left = '';
    dragState.element.style.top = '';
    dragState.element.style.width = '';
    dragState.element.style.zIndex = '';
    dragState.element.style.pointerEvents = '';
    
    // Replace placeholder with element
    dragState.placeholder.parentNode.replaceChild(dragState.element, dragState.placeholder);
    
    // Re-enable page interactions
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    // Update IDs
    updateLocationIds();
    
    // Reset drag state
    resetDragState();
    
    // Add completion haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
}

/**
 * Resets drag state
 */
function resetDragState() {
    dragState.element = null;
    dragState.handle = null;
    dragState.isDragging = false;
    dragState.startX = 0;
    dragState.startY = 0;
    dragState.currentX = 0;
    dragState.currentY = 0;
    dragState.offsetX = 0;
    dragState.offsetY = 0;
    dragState.placeholder = null;
    dragState.container = null;
    dragState.originalIndex = 0;
    dragState.scrolling = false;
}

/**
 * Gets the element that should come after the drop position
 */
function getDropTarget(container, y) {
    const elements = [...container.querySelectorAll('.landloc_p:not(.dragging), .drag-placeholder')];
    
    return elements.reduce((closest, child) => {
        if (child === dragState.placeholder) return closest;
        
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Function to update all location IDs based on their current position
function updateLocationIds() {
    const landlocsDiv = document.getElementById('landlocs');
    const locationElements = landlocsDiv.querySelectorAll('.landloc_p');
    
    locationElements.forEach((element, index) => {
        element.id = `ll_${index}`;
    });
}

/**
 * Initializes drag-and-drop functionality for all existing location elements
 * Scans for existing location elements and applies drag functionality to each.
 * Also ensures all elements have proper sequential IDs. Called during app
 * initialization to set up any pre-existing locations.
 * 
 * @function initializeDragAndDrop
 * @returns {void}
 */
function initializeDragAndDrop() {
    const landlocsDiv = document.getElementById('landlocs');
    if (landlocsDiv) {
        const existingLocations = landlocsDiv.querySelectorAll('.landloc_p');
        existingLocations.forEach(element => {
            makeDraggable(element);
        });
        updateLocationIds();
    }
}

/**
 * Retrieves all current land location names as an array
 * Extracts text content from all location elements in current order.
 * Used when saving daily entries to capture current locations.
 * 
 * @function getLandLocations
 * @returns {Array<string>} Array of location names in current order
 */
function getLandLocations() {
    const landlocsDiv = document.getElementById('landlocs');
    const locationElements = landlocsDiv.querySelectorAll('.landloc_p');
    return Array.from(locationElements).map(element => {
        // Prefer the explicit content span added by makeDraggable so UI controls
        // (drag handle, delete button) are not included in the returned text.
        const contentSpan = element.querySelector('.location-content');
        if (contentSpan) return contentSpan.textContent.trim();
        // Fallback: use the element textContent if the structure isn't present
        return element.textContent.trim();
    });
}

/**
 * Populates the land locations section with provided location names
 * Clears existing locations and creates new draggable elements for each
 * location in the provided array. Used when editing existing entries.
 * 
 * @function setLandLocations
 * @param {Array<string>} locations - Array of location names to display
 * @returns {void}
 */
function setLandLocations(locations) {
    const landlocsDiv = document.getElementById('landlocs');
    // Clear existing locations
    landlocsDiv.innerHTML = '';
    
    // Add each location
    if (locations && Array.isArray(locations)) {
        locations.forEach(locationText => {
            if (locationText && locationText.trim()) {
                const locationElement = document.createElement('p');
                locationElement.classList.add("landloc_p");
                locationElement.textContent = locationText.trim();
                
                // Make element draggable
                makeDraggable(locationElement);
                
                landlocsDiv.appendChild(locationElement);
            }
        });
        
        // Update all IDs after adding
        updateLocationIds();
    }
}

/**
 * Removes all land locations from the display
 * Clears the land locations container completely. Used when
 * clearing the form or starting fresh entry.
 * 
 * @function clearLandLocations
 * @returns {void}
 */
function clearLandLocations() {
    const landlocsDiv = document.getElementById('landlocs');
    landlocsDiv.innerHTML = '';
}

// Export functions for global access
window.locationManager = {
    addLandLocation,
    deleteLocation,
    initializeDragAndDrop,
    getLandLocations,
    setLandLocations,
    clearLandLocations
};