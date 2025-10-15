import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRawDetections, type RawDetection } from "../../api/Map/Raw_Detections/rawDetections";
import FilterSidebar from "../../components/Sidebar/FilterSidebar";
import { styles } from "./WildfireMapPage.styles";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

// --- Custom Fire Icon ---
const fireIcon = L.icon({
  iconUrl: "/images/fire-icon.webp", // from public/images
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

var topoLayer = L.tileLayer(
  `https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'}
);

var contoursLayer = L.tileLayer(
  `https://api.maptiler.com/tiles/contours-v2/{z}/{x}/{y}.pbf?key=${MAPTILER_KEY}`,
  { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
    opacity: 1
  }
);

var hillshadingLayer = L.tileLayer(
  `https://api.maptiler.com/tiles/hillshade/{z}/{x}/{y}.webp?key=${MAPTILER_KEY}`,
  { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'}
);

// --- Zoom Controller Hook ---
function ZoomController({ zoom }: { zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setZoom(zoom);
  }, [zoom, map]);
  return null;
}

export default function WildfireMapPage() {
  const [detections, setDetections] = useState<RawDetection[]>([]);
  const [filtered, setFiltered] = useState<RawDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    dateRange: { start: "", end: "" },
    confidence: "",
    zoom: 10,
  });

  useEffect(() => {
    async function loadDetections() {
      const data = await fetchRawDetections();
      setDetections(data);
      setFiltered(data);
      setLoading(false);
    }
    loadDetections();
  }, []);

  // Apply filters when user changes them
  useEffect(() => {
    if (!detections.length) return;

    let filteredData = [...detections];

    if (filters.confidence) {
      filteredData = filteredData.filter(
        (d) => d.confidence?.toLowerCase() === filters.confidence.toLowerCase()
      );
    }

    if (
      filters.dateRange &&
      filters.dateRange.start &&
      filters.dateRange.end
    ) {
      filteredData = filteredData.filter((d) => {
        const date = new Date(d.acq_date);
        return (
          date >= new Date(filters.dateRange.start) &&
          date <= new Date(filters.dateRange.end)
        );
      });
    }

    setFiltered(filteredData);
  }, [filters, detections]);

return (
  <div 
    className="h-[calc(100vh-64px)] overflow-hidden"
    style={styles.container}
  >
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

      {/* Map Section */}
      <div
        className="fixed top-[64px] h-[calc(100vh-64px)] left-0 w-full transition-all duration-300 ease-in-out"
      >
        <MapContainer
          center={[30.2672, -97.7431]} // Austin
          zoom={filters.zoom}
          className="h-full w-full"
          layers={[topoLayer, contoursLayer, hillshadingLayer]}
        >
          <ZoomController zoom={filters.zoom} />

          {!loading &&
            filtered.map((fire) => (
              <Marker
                key={fire.id}
                position={[fire.latitude, fire.longitude]}
                icon={fireIcon}
              >
                <Popup>
                  <strong>Latitude: </strong> {fire.latitude} <br />
                  <strong>Longitude: </strong> {fire.longitude} <br />
                  <strong>Confidence:</strong> {fire.confidence} <br />
                  <strong>Brightness:</strong> {fire.bright_ti4} <br />
                  <strong>Date:</strong> {fire.acq_date} <br />
                  <strong>Time: </strong> {fire.acq_time}
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}