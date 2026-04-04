import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { styles } from './EvacuationRoute.styles';
import { getEvacuationRoute, type EvacuationData } from '../../api/evacuation';
import { colors } from '../../styles/colors';

// Obtain the latitude and longitude of the individual
interface Location {
    lat: number;
    lng: number;
}

const markerIcon = L.icon({
  iconUrl: "/images/Marker-Icon.png",
  iconSize: [28, 38],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// Safely format risk as percentage (handles NaN, null, undefined)
function formatRiskPercent(risk: number | null | undefined): string {
    const n = Number(risk);
    if (Number.isNaN(n) || n < 0 || n > 1) return '0';
    return (n * 100).toFixed(0);
}

// Main component for evacuation route page
const EvacuationRoute: React.FC = () => {
    const [location, setLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [evacuationData, setEvacuationData] = useState<EvacuationData | null>(null);
    const [demoMode, setDemoMode] = useState<boolean>(false);
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Initialize map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const mapInstance = L.map(mapContainerRef.current).setView([30.2672, -97.7431], 11);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapInstance);

            mapRef.current = mapInstance;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Get user's current location using the Geolocation API
    const getUserLocation = (): Promise<Location> => {
        return new Promise((resolve, reject) => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    (error) => reject(error),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                reject(new Error("Geolocation not supported by your browser"));
            }
        });
    };

    // Main handler — gets location, calls backend, displays result
    const handleGetEvacuationRoute = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log("Requesting location permission...");
            const userLocation = await getUserLocation();
            console.log("Got location:", userLocation);
            setLocation(userLocation);

            // Drop a marker at the user's location
            if (mapRef.current) {
                L.marker([userLocation.lat, userLocation.lng], {icon: markerIcon})
                    .addTo(mapRef.current)
                    .bindPopup('Your Location')
                    .openPopup();
                mapRef.current.setView([userLocation.lat, userLocation.lng], 13);
            }

            console.log("Calling backend for evacuation route...", demoMode ? "(demo mode)" : "");

            const data = await getEvacuationRoute(userLocation, { demo: demoMode });
            console.log("Got evacuation data:", data);

            setEvacuationData(data);

            if (data.should_evacuate && mapRef.current) {
                displayRouteOnMap(data);
            }

        } catch (err: any) {
            console.error("Error:", err);

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

    // Display the evacuation route on the map using Leaflet
    const displayRouteOnMap = (data: EvacuationData) => {
        if (!mapRef.current || !data.route || !data.safe_zone) return;

        const routeLayer = L.geoJSON(data.route.geometry, {
            style: { color: '#FF0000', weight: 6, opacity: 0.8 }
        }).addTo(mapRef.current);

        L.marker([data.safe_zone.latitude, data.safe_zone.longitude], {icon: markerIcon})
            .addTo(mapRef.current)
            .bindPopup(`Safe Zone (${data.safe_zone.direction})`)
            .openPopup();

        mapRef.current.fitBounds(routeLayer.getBounds());
    };

    console.log("🧠 Evacuation Data in component:", evacuationData);
    console.log("🚨 Should evacuate:", evacuationData?.should_evacuate);
    console.log("🗺 Route:", evacuationData?.route);
    console.log("📍 Safe zone:", evacuationData?.safe_zone);

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Evacuation Routes</h2>
            <p style={styles.subtitle}>
                Get personalized evacuation routes based on current wildfire risk in your area.
            </p>

            <div style={{ padding: '1rem', background: colors.cream, borderRadius: '1rem', margin: '16px auto', border: '1px solid colors.olive' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 500, fontFamily: "'Source Sans 3', sans-serif", color: colors.stone,}}>
                    <input
                        type="checkbox"
                        checked={demoMode}
                        onChange={(e) => {
                            setDemoMode(e.target.checked);
                            setEvacuationData(null); // Clear so user clicks again for fresh result
                        }}
                    />
                    <span>Demo mode: show evacuation scenario (simulated high risk)</span>
                </label>
                <p style={{ margin: '6px 0 0 26px', fontSize: 13, color: colors.stone, fontFamily: "'Source Sans 3', sans-serif", }}>
                    Check this to see the full evacuation flow regardless of actual risk.
                </p>
            </div>

            <button 
                onClick={handleGetEvacuationRoute}
                disabled={loading}
                style={loading ? styles.buttonDisabled : styles.button}
            >
                {loading ? 'Getting Route...' : 'Get My Evacuation Route'}
            </button>

            {error && (
                <div style={styles.errorBox}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {location && !evacuationData && (
                <div style={styles.infoBox}>
                    <strong>Your Location:</strong><br />
                    Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
                </div>
            )}

            {evacuationData && (
                <div>
                    {evacuationData.should_evacuate ? (
                        <div style={styles.alertBoxDanger}>
                            <h3 style={styles.alertTitle}>⚠ EVACUATION RECOMMENDED{demoMode ? ' (Demo)' : ''}</h3>
                            <p><strong>Current Fire Risk:</strong> {formatRiskPercent(evacuationData.current_risk)}%</p>
                            <p><strong>Direction:</strong> Head {evacuationData.safe_zone?.direction}</p>
                            <p><strong>Distance:</strong> {evacuationData.safe_zone?.distance_miles} miles</p>
                            <p><strong>Estimated Time:</strong> {Math.round(evacuationData.route?.duration_minutes ?? 0)} minutes</p>
                            <p><strong>Safe Zone Risk:</strong> {formatRiskPercent(evacuationData.safe_zone?.risk_level)}%</p>
                        </div>
                    ) : (
                        <div style={styles.alertBoxSafe}>

                            <h3 style={styles.alertTitle}>✓ Currently Safe</h3>
                            <p><strong>Fire Risk:</strong> {formatRiskPercent(evacuationData.current_risk)}%</p>
                            <p>{evacuationData.message ?? 'No evacuation needed at this time. Continue monitoring conditions.'}</p>
                        </div>
                    )}
                </div>
            )}

            <div ref={mapContainerRef} style={styles.mapContainer}></div>

            {!location && (
                <div style={styles.instructionsBox}>
                    <h4 style={styles.instructionsTitle}>How it works:</h4>
                    <ol style={styles.instructionsList}>
                        <li>Click "Get My Evacuation Route"</li>
                        <li>Allow location access when prompted</li>
                        <li>View your personalized evacuation route</li>
                    </ol>
                </div>
            )}
        </div>
    );
};

export default EvacuationRoute;