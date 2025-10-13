// Function to add land location
function addLandLocation() {
    const location = prompt('Enter land location:');
    
    if (location && location.trim() !== '') {
        const landlocsDiv = document.getElementById('landlocs');
        const locationElement = document.createElement('p');
        locationElement.classList.add("landloc_p");
        locationElement.textContent = location.trim();
        
        // Make element draggable
        makeDraggable(locationElement);
        
        landlocsDiv.appendChild(locationElement);
        
        // Update all IDs after adding
        updateLocationIds();
    }
}

function deleteLocation(id) {
    if (confirm("Delete this location?")) {
        document.getElementById(id).remove();
        // Update all IDs after deletion
        updateLocationIds();
    }
}

// Function to make a location element draggable
function makeDraggable(element) {
    element.draggable = true;
    element.style.cursor = 'move';
    
    // Add drag event listeners
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('drop', handleDrop);
    element.addEventListener('dragend', handleDragEnd);
    
    // Add click event listener for deletion
    element.addEventListener('click', (e) => {
        // Prevent deletion during drag operations
        if (!element.classList.contains('dragging')) {
            deleteLocation(element.id);
        }
    });
}

// Drag and drop event handlers
let draggedElement = null;

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

// Function to initialize drag and drop for existing locations
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

// Make functions available globally
window.locationManager = {
    addLandLocation,
    deleteLocation,
    initializeDragAndDrop
};