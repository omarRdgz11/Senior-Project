import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRawDetections, type RawDetection } from "../api/Map/Raw_Detections/rawDetections";
import L from "leaflet";

// Define bounding boxes as Leaflet LatLngBounds
const bounds = {
  austin: [
    [30.00, -98.10], // Southwest corner (lat, lon)
    [30.60, -97.50], // Northeast corner (lat, lon)
  ] as [[number, number], [number, number]],
  central_tx: [
    [28.50, -101.50],
    [32.50, -96.50],
  ] as [[number, number], [number, number]],
  texas: [
    [25.80, -106.65],
    [36.50, -93.50],
  ] as [[number, number], [number, number]],
};

// Custom fire icon
const fireIcon = new L.Icon({
  iconUrl: '/images/fire-icon.webp', // fire emoji icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export default function WildfireMap() {
  const [detections, setDetections] = useState<RawDetection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetections() {
      const data = await fetchRawDetections();
      setDetections(data);
      setLoading(false);
    }
    loadDetections();
  }, []);

  return (
    <div className="h-[calc(100vh-80px)] w-full">
      <MapContainer center={[30.2672, -97.7431]} zoom={7} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Bounding boxes */}
        <Rectangle bounds={bounds.austin} pathOptions={{ color: "red" }} />
        <Rectangle bounds={bounds.central_tx} pathOptions={{ color: "orange" }} />
        <Rectangle bounds={bounds.texas} pathOptions={{ color: "blue" }} />

        {/* Show markers */}
        {!loading &&
          detections.map((fire) => (
            <Marker key={fire.id} position={[fire.latitude, fire.longitude] } icon={fireIcon}>
              <Popup>
                <strong>Date:</strong> {fire.acq_date} <br />
                <strong>Time:</strong> {fire.acq_time} <br />
                <strong>Confidence:</strong> {fire.confidence} <br />
                <strong>Brightness:</strong> {fire.bright_ti4} <br />
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
