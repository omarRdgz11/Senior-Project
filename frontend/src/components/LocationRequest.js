// Step 1: Create a function to get user location

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                // Success callback
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                // Error callback
                (error) => {
                    reject(error);
                }
            );
        } else {
            reject(new Error("Geolocation not supported"));
        }
    });
}

// Step 2: Use it when user opens the site or clicks a button
async function checkMyFireRisk() {
    try {
        const location = await getUserLocation();
        console.log("User location:", location);
        
        // Send to backend to check fire risk
        const response = await fetch('/api/fire-risk', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(location)
        });
        
        const riskData = await response.json();
        displayRiskLevel(riskData);
        
    } catch (error) {
        console.error("Location error:", error);
        // Show manual address input as fallback
        showAddressInputForm();
    }
}