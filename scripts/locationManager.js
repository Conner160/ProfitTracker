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
 * Adds drag-and-drop functionality to a location element
 * Sets up both desktop drag events and mobile touch events with long-press
 * activation. Includes click handling for deletion and prevents conflicts
 * between drag and click operations.
 * 
 * @function makeDraggable
 * @param {HTMLElement} element - The location element to make draggable
 * @returns {void}
 */
function makeDraggable(element) {
    element.draggable = true;
    element.style.cursor = 'move';
    
    // Add drag event listeners for desktop
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('drop', handleDrop);
    element.addEventListener('dragend', handleDragEnd);
    
    // Add touch event listeners for mobile
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Add click event listener for deletion
    element.addEventListener('click', (e) => {
        // Prevent deletion during drag operations or if touch dragging was active
        if (!element.classList.contains('dragging') && !touchState.isDragging) {
            deleteLocation(element.id);
        }
    });
}

// Desktop drag-and-drop state management
let draggedElement = null; // Currently dragged element reference

// Mobile touch drag state object - tracks touch interaction details
let touchState = {
    element: null,        // Element being touched/dragged
    isDragging: false,    // Whether active drag is in progress
    longPressTimer: null, // Timer for long-press activation
    startY: 0,           // Initial touch Y coordinate
    currentY: 0,         // Current touch Y coordinate
    scrollEnabled: true,  // Whether page scrolling is enabled
    originalPosition: null // Original element position for restoration
};

/**
 * Handles the start of a desktop drag operation
 * Sets up drag state and applies visual feedback. Called when user
 * starts dragging an element on desktop browsers.
 * 
 * @function handleDragStart
 * @param {DragEvent} e - Browser drag event
 * @returns {void}
 */
function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const landlocsDiv = document.getElementById('landlocs');
    const afterElement = getDragAfterElement(landlocsDiv, e.clientY);
    
    if (afterElement == null) {
        landlocsDiv.appendChild(draggedElement);
    } else {
        landlocsDiv.insertBefore(draggedElement, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();
    // Update IDs after drop
    updateLocationIds();
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedElement = null;
}

/**
 * Handles the start of a mobile touch interaction
 * Begins long-press timer for drag activation and stores touch coordinates.
 * Provides visual feedback during long-press detection period.
 * 
 * @function handleTouchStart
 * @param {TouchEvent} e - Browser touch event
 * @returns {void}
 */
function handleTouchStart(e) {
    const touch = e.touches[0];
    touchState.element = e.target;
    touchState.startY = touch.clientY;
    touchState.currentY = touch.clientY;
    touchState.isDragging = false;
    
    // Store original position for potential restoration
    const parent = e.target.parentNode;
    const siblings = Array.from(parent.children);
    touchState.originalPosition = siblings.indexOf(e.target);
    
    // Start long press timer (0.5 seconds)
    touchState.longPressTimer = setTimeout(() => {
        startTouchDrag(e.target);
    }, 500);
    
    // Add visual feedback for long press
    e.target.classList.add('long-press-pending');
}

function handleTouchMove(e) {
    if (touchState.longPressTimer && !touchState.isDragging) {
        const touch = e.touches[0];
        const deltaY = Math.abs(touch.clientY - touchState.startY);
        
        // Cancel long press if user moves too much during the press
        if (deltaY > 10) {
            clearTimeout(touchState.longPressTimer);
            touchState.longPressTimer = null;
            touchState.element.classList.remove('long-press-pending');
        }
        return;
    }
    
    if (touchState.isDragging) {
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        touchState.currentY = touch.clientY;
        
        // Update visual position
        const element = touchState.element;
        element.style.transform = `translateY(${touchState.currentY - touchState.startY}px)`;
        
        // Find the element to insert before
        const landlocsDiv = document.getElementById('landlocs');
        const afterElement = getTouchDropTarget(landlocsDiv, touchState.currentY);
        
        if (afterElement == null) {
            landlocsDiv.appendChild(element);
        } else {
            landlocsDiv.insertBefore(element, afterElement);
        }
    }
}

function handleTouchEnd(e) {
    // Clear long press timer
    if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
        touchState.longPressTimer = null;
    }
    
    // Remove long press visual feedback
    if (touchState.element) {
        touchState.element.classList.remove('long-press-pending');
    }
    
    if (touchState.isDragging) {
        // End drag operation
        endTouchDrag();
        // Prevent click event from firing
        setTimeout(() => {
            touchState.isDragging = false;
        }, 100);
    }
    
    // Reset touch state
    touchState.element = null;
    touchState.startY = 0;
    touchState.currentY = 0;
}

function startTouchDrag(element) {
    touchState.isDragging = true;
    element.classList.add('dragging', 'touch-dragging');
    element.classList.remove('long-press-pending');
    
    // Disable page scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    // Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    
    // Prevent text selection events
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventSelection);
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function endTouchDrag() {
    if (touchState.element) {
        touchState.element.classList.remove('dragging', 'touch-dragging');
        touchState.element.style.transform = '';
        
        // Re-enable page scrolling
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        
        // Re-enable text selection
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.mozUserSelect = '';
        document.body.style.msUserSelect = '';
        
        // Remove text selection event prevention
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);
        
        // Update IDs after drop
        updateLocationIds();
    }
}

// Helper function to prevent text selection during drag
function preventSelection(e) {
    e.preventDefault();
    return false;
}

// Helper function for touch drag targeting
function getTouchDropTarget(container, y) {
    const draggableElements = [...container.querySelectorAll('.landloc_p:not(.touch-dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Helper function to determine where to insert the dragged element
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.landloc_p:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
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
    return Array.from(locationElements).map(element => element.textContent.trim());
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