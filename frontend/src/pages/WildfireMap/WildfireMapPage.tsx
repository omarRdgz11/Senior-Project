import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import FilterSidebar from "../../components/Sidebar/FilterSidebar";
import { styles } from "./WildfireMapPage.styles";
import { predictPointGET, fetchFirms } from "../../api/predict"; 

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const fireIcon = L.icon({
  iconUrl: "/images/fire-icon.webp",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const predictIcon = L.icon({
  iconUrl: "/images/predict-fire-icon.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const bounds = new L.LatLngBounds([[30.00, -98.10], [30.60, -97.50]]);

const topoLayer = L.tileLayer(
  `https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  }
);

var contoursLayer = L.tileLayer(
  `https://api.maptiler.com/tiles/contours-v2/{z}/{x}/{y}.pbf?key=${MAPTILER_KEY}`,
  { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
    opacity: 1
  }
);

const hillshadingLayer = L.tileLayer(
  `https://api.maptiler.com/tiles/hillshade/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`,
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  }
);

// function ZoomController({ zoom }: { zoom: number }) {
//   const map = useMap();
//   useEffect(() => {
//     map.setZoom(zoom);
//   }, [zoom, map]);
//   return null;
// }

export default function WildfireMapPage() {
  // const [firmsRes, setFirmsRes] = useState<FirmsItem[]>([]);
  // const [predictions, setPredictions] = useState<any>(null);
  const [filtered, setFiltered] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [filters, setFilters] = useState({
    dateRange: { start: "", end: "" },
    coordinates: { 
      minLon: -98.0998,
      minLat: 30.05,
      maxLon: -97.5,
      maxLat: 30.6,
    },
    radius_km: 25,
    threshold: 0.25,
    zoom: 8,
  });

  useEffect(() => {
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // --- Shared filter values ---
      const start =
        filters.dateRange.start ||
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      const end = filters.dateRange.end || new Date().toISOString().slice(0, 10);
      const centerLat =
        (filters.coordinates.minLat + filters.coordinates.maxLat) / 2;
      const centerLon =
        (filters.coordinates.minLon + filters.coordinates.maxLon) / 2;

      // --- Fetch FIRMS and Prediction in parallel ---
      const [firmsData, predictData] = await Promise.all([
        fetchFirms({
          bbox: {
            minLon: filters.coordinates.minLon,
            minLat: filters.coordinates.minLat,
            maxLon: filters.coordinates.maxLon,
            maxLat: filters.coordinates.maxLat,
          },
          start,
          end,
          max: 8000,
        }),
        predictPointGET({
          lat: centerLat,
          lon: centerLon,
          date: start,
          radius_km: filters.radius_km,
          threshold: filters.threshold,
        }),
      ]);

      // --- Combine FIRMS and Prediction ---
      const combined = [
        ...firmsData.items.map((f: any) => ({
          ...f,
          lat: f.latitude ?? f.lat,
          lon: f.longitude ?? f.lon,
          type: "firms",
        })),
        { 
          ...predictData,
          lat: predictData.where?.lat,
          lon: predictData.where?.lon,
          type: "prediction",
        },
      ];

      // --- Filter combined data ---
      const filteredData = combined.filter((fire) => {
        const lat = fire.lat;
        const lon = fire.lon;
        const date = fire.date || fire.when?.date;

        if (!lat || !lon || !date) return false;

        const inBounds =
          lat >= filters.coordinates.minLat &&
          lat <= filters.coordinates.maxLat &&
          lon >= filters.coordinates.minLon &&
          lon <= filters.coordinates.maxLon;

        const inDateRange = date >= start && date <= end;
        
        const meetsThreshold =
          fire.type === "prediction"
            ? (fire.confidence ?? fire.probability ?? 0) >= filters.threshold
            : true;

        return inBounds && inDateRange && meetsThreshold;
      });

      setFiltered(filteredData);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  loadData();
}, [filters.coordinates, filters.dateRange, filters.radius_km, filters.threshold]);


  // --- Error States ---
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden" style={styles.container}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={styles.sidebar}>
          <FilterSidebar filters={filters} setFilters={setFilters} />
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-3 right-3 z-[1000] border border-base-300 rounded-md px-2 py-1 text-sm shadow hover:bg-base-200"
        style={styles.buttons}
      >
        {sidebarOpen ? "← Hide" : "☰ Filters"}
      </button>

      {/* Map */}
      <div className="fixed top-[64px] h-[calc(100vh-64px)] left-0 w-full transition-all duration-300 ease-in-out">
        <MapContainer
          center={[30.2672, -97.7431]}
          zoom={filters.zoom}
          className="h-full w-full"
          layers={[topoLayer, contoursLayer, hillshadingLayer]}
          maxBounds={bounds}
          minZoom={6}
          maxZoom={20}
        >

          {!loading &&
            filtered
              .filter((f) => bounds.contains([f.lat, f.lon]))
              .map((f, idx) => (
                <Marker
                  key={idx}
                  position={[f.lat, f.lon]}
                  icon={f.type === "prediction" ? predictIcon : fireIcon}
                >
                  <Popup>
                    {f.type === "firms" ? (
                      <>
                        <strong>Date:</strong> {f.date} <br />
                        <strong>Latitude:</strong> {f.lat} <br />
                        <strong>Longitude:</strong> {f.lon} <br />
                        {f.sat && <><strong>Satellite:</strong> {f.sat}<br /></>}
                        {f.dn && <><strong>Day/Night:</strong> {f.dn}<br /></>}
                      </>
                    ) : (
                      <>
                        <strong>Predicted Fire Risk</strong> <br />
                        <strong>Latitude:</strong> {f.lat.toFixed(4)} <br />
                        <strong>Longitude:</strong> {f.lon.toFixed(4)} <br />
                        <strong>Probability:</strong>{" "}
                        {(f.probability * 100).toFixed(2)}% <br />
                        <strong>Threshold:</strong> {f.threshold_used ?? "0.25"} <br />
                        <strong>Date:</strong> {f.when?.date ?? "N/A"} <br />
                        <strong>Radius:</strong> {f.where?.radius_km ?? "N/A"} km
                      </>
                    )}
                  </Popup>
                </Marker>
              ))}
        </MapContainer>
      </div>
    </div>
  );
}