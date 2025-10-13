// Function to add land location
function addLandLocation() {
    const location = prompt('Enter land location:');
    
    if (location && location.trim() !== '') {
        const landlocsDiv = document.getElementById('landlocs');
        const locationElement = document.createElement('p');
        locationElement.classList.add("landloc_p");
        locationElement.id = "ll_" + landlocsDiv.childElementCount;
        console.log(locationElement.id);
        locationElement.textContent = location.trim();
        landlocsDiv.appendChild(locationElement);

        //add click event listener to that id
        locationElement.addEventListener('click', () => deleteLocation(locationElement.id));
    }
}

function deleteLocation(id) {
    if (confirm("Delete this location?")) {
        document.getElementById(id).remove();
    }
}

// Make functions available globally
window.locationManager = {
    addLandLocation,
    deleteLocation
};