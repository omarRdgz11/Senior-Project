// src/components/DashboardMiniMap.tsx
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup } from "react-leaflet";
import type { RegionInfo, RegionMapFirmsItem } from "../api/regions";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const topoLayer = L.tileLayer(
  `https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  }
);

const fireIcon = L.icon({
  iconUrl: "/images/fire-icon.webp",
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  popupAnchor: [0, -20],
});

const predictIcon = L.icon({
  iconUrl: "/images/predict-fire-icon.png",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

export type PredictionPin = {
  lat: number;
  lon: number;
  probability: number;
  label: number;
  threshold: number;
};

type Props = {
  regionInfo: RegionInfo;
  firms: RegionMapFirmsItem[];
  predictionPin?: PredictionPin | null;
};

/**
 * Compact Leaflet map for the dashboard card.
 * Re-mounts (via key) when the region changes to re-center automatically.
 * scrollWheelZoom is disabled so the page scroll isn't hijacked.
 */
export default function DashboardMiniMap({ regionInfo, firms, predictionPin }: Props) {
  const center: [number, number] = [regionInfo.center.lat, regionInfo.center.lon];

  return (
    <MapContainer
      key={regionInfo.slug}
      center={center}
      zoom={8}
      style={{ height: "300px", borderRadius: "0.75rem", width: "100%" }}
      layers={[topoLayer]}
      scrollWheelZoom={false}
      zoomControl={true}
    >
      {firms.map((f, idx) => (
        <Marker key={`mf-${idx}`} position={[f.lat, f.lon]} icon={fireIcon}>
          <Popup>
            <strong>FIRMS Detection</strong>
            <br />
            Date: {f.date}
            <br />
            Conf: {f.conf != null ? `${Math.round(f.conf)}%` : "—"}
            <br />
            Sat: {f.sat ?? "—"}
          </Popup>
        </Marker>
      ))}

      {predictionPin && (
        <Marker
          position={[predictionPin.lat, predictionPin.lon]}
          icon={predictIcon}
        >
          <Popup>
            <strong>Predicted Fire Risk</strong>
            <br />
            Probability: {(predictionPin.probability * 100).toFixed(1)}%
            <br />
            Threshold: {predictionPin.threshold.toFixed(2)}
            <br />
            Risk: {predictionPin.label === 1 ? "⚠️ High" : "✓ Low"}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
