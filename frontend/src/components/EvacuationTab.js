import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function EvacuationTab() {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [evacuationData, setEvacuationData] = useState(null);
    const [map, setMap] = useState(null);

    // Initialize map when component mounts
    useEffect(() => {
        const mapInstance = L.map('evacuation-map').setView([30.2672, -97.7431], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);
        
        setMap(mapInstance);

        // Cleanup on unmount
        return () => {
            mapInstance.remove();
        };
    }, []);

    // Function to get user location
    const getUserLocation = () => {
        return new Promise((resolve, reject) => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    (error) => {
                        reject(error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } else {
                reject(new Error("Geolocation not supported by your browser"));
            }
        });
    };

    // Main function to get evacuation route
    const handleGetEvacuationRoute = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log(" Requesting location permission...");
            
            // THIS IS WHERE THE PERMISSION POPUP APPEARS
            const userLocation = await getUserLocation();
            
            console.log(" Got location:", userLocation);
            setLocation(userLocation);

            // Add marker for user location
            if (map) {
                L.marker([userLocation.lat, userLocation.lng])
                    .addTo(map)
                    .bindPopup('Your Location')
                    .openPopup();
                
                map.setView([userLocation.lat, userLocation.lng], 13);
            }

            // Call backend to get evacuation route
            console.log("📡 Calling backend for evacuation route...");
            
            const response = await fetch('/api/evacuation-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userLocation)
            });

            if (!response.ok) {
                throw new Error('Failed to get evacuation route');
            }

            const data = await response.json();
            console.log(" Got evacuation data:", data);
            
            setEvacuationData(data);

            // Display route on map
            if (data.should_evacuate && map) {
                displayRouteOnMap(data);
            }

        } catch (err) {
            console.error(" Error:", err);
            
            if (err.code === 1) {
                setError('Location access denied. Please allow location access to get evacuation routes.');
            } else if (err.code === 2) {
                setError('Unable to determine your location. Please check your device settings.');
            } else if (err.code === 3) {
                setError('Location request timed out. Please try again.');
            } else {
                setError(err.message || 'An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Display route on Leaflet map
    const displayRouteOnMap = (data) => {
        if (!map) return;

        // Draw route
        const routeLayer = L.geoJSON(data.route.geometry, {
            style: {
                color: '#FF0000',
                weight: 6,
                opacity: 0.8
            }
        }).addTo(map);

        // Add destination marker
        L.marker([data.safe_zone.latitude, data.safe_zone.longitude])
            .addTo(map)
            .bindPopup(`Safe Zone (${data.safe_zone.direction})`)
            .openPopup();

        // Fit map to show entire route
        map.fitBounds(routeLayer.getBounds());
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Evacuation Routes</h2>
            <p>Get personalized evacuation routes based on current wildfire risk in your area.</p>

            {/* Button to trigger location request */}
            <button
                onClick={handleGetEvacuationRoute}
                disabled={loading}
                style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    background: loading ? '#ccc' : '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '20px'
                }}
            >
                {loading ? 'Getting Route...' : '📍 Get My Evacuation Route'}
            </button>

            {/* Error message */}
            {error && (
                <div style={{
                    padding: '15px',
                    background: '#f8d7da',
                    color: '#721c24',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    <strong> Error:</strong> {error}
                </div>
            )}

            {/* Current location info */}
            {location && !evacuationData && (
                <div style={{
                    padding: '15px',
                    background: '#d1ecf1',
                    color: '#0c5460',
                    borderRadius: '5px',
                    marginBottom: '20px'
                }}>
                    <strong> Your Location:</strong><br />
                    Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
                </div>
            )}

            {/* Evacuation results */}
            {evacuationData && (
                <div>
                    {evacuationData.should_evacuate ? (
                        <div style={{
                            padding: '20px',
                            background: '#ff4444',
                            color: 'white',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3>EVACUATION RECOMMENDED</h3>
                            <p><strong>Current Fire Risk:</strong> {(evacuationData.current_risk * 100).toFixed(0)}%</p>
                            <p><strong>Direction:</strong> Head {evacuationData.safe_zone.direction}</p>
                            <p><strong>Distance:</strong> {evacuationData.safe_zone.distance_miles} miles</p>
                            <p><strong>Estimated Time:</strong> {Math.round(evacuationData.route.duration_minutes)} minutes</p>
                            <p><strong>Safe Zone Risk:</strong> {(evacuationData.safe_zone.risk_level * 100).toFixed(0)}%</p>
                        </div>
                    ) : (
                        <div style={{
                            padding: '20px',
                            background: '#44ff44',
                            color: '#004400',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3>✓ Currently Safe</h3>
                            <p><strong>Fire Risk:</strong> {(evacuationData.current_risk * 100).toFixed(0)}%</p>
                            <p>No evacuation needed at this time. Continue monitoring conditions.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Map container */}
            <div 
                id="evacuation-map" 
                style={{ 
                    height: '500px', 
                    width: '100%',
                    border: '2px solid #ddd',
                    borderRadius: '8px'
                }}
            ></div>

            {/* Instructions */}
            {!location && (
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '5px'
                }}>
                    <h4>How it works:</h4>
                    <ol>
                        <li>Click "Get My Evacuation Route"</li>
                        <li>Allow location access when prompted</li>
                        <li>View your personalized evacuation route</li>
                    </ol>
                </div>
            )}
        </div>
    );
}

export default EvacuationTab;