import { useEffect, useRef, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import FilterSidebar from "../../components/Sidebar/FilterSidebar";

import { styles } from "./WildfireMapPage.styles";

import { fetchDailyFireRisk } from "../../api/dailyFireRisk";
import { fetchRegionMapFirms, type RegionInfo } from "../../api/regions";
import { fetchFirmsMaxDate } from "../../api/dailyFireRisk";

/* ---------- helpers: local-date aware ---------- */

/** Returns today's date as YYYY-MM-DD in local time (no UTC midnight issue). */
function getLocalToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Returns the date N days ago as YYYY-MM-DD in local time. */
function getLocalDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/* ---------- Haversine distance ---------- */

/** Great-circle distance in miles. */
function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ---------- Demo prediction helpers ----------
   DEMO ONLY — seeded RNG generates plausible-looking prediction points
   per (region, date). Results are stable: same inputs → same points.
   Remove or replace when a real prediction point grid is available.
*/

/** Mulberry32 seeded PRNG. Returns a [0,1) value each call. */
function mulberry32(seed: number): () => number {
  return () => {
    // eslint-disable-next-line no-param-reassign
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed ^ (seed >>> 15);
    t = Math.imul(t, t | 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

/** djb2-style string hash → unsigned 32-bit seed. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

type DemoPoint = { lat: number; lon: number; intensity: number };

/**
 * Generate deterministic demo prediction points for a region + date.
 * Points represent "predicted fire risk hotspots" within the region bbox,
 * filtered to the given radius from region center.
 */
function generateDemoPoints(
  regionInfo: RegionInfo,
  predDate: string,
  radiusMiles: number
): DemoPoint[] {
  const seed = hashStr(`${regionInfo.slug}|${predDate}`);
  const rng = mulberry32(seed);

  const { west, east, south, north } = regionInfo.bbox;
  const cLat = regionInfo.center.lat;
  const cLon = regionInfo.center.lon;

  // 3–6 hotspot cluster centers within the bbox
  const nHotspots = 3 + Math.floor(rng() * 4);
  const hotspots: Array<{ lat: number; lon: number; weight: number }> = [];
  for (let i = 0; i < nHotspots; i++) {
    // Slightly biased toward center (average two uniform samples)
    const u = (rng() * 0.65 + rng() * 0.35);
    const v = (rng() * 0.65 + rng() * 0.35);
    hotspots.push({
      lat: south + (north - south) * u,
      lon: west + (east - west) * v,
      weight: 0.4 + rng() * 0.6,
    });
  }

  const points: DemoPoint[] = [];
  for (const hs of hotspots) {
    const n = 10 + Math.floor(rng() * 20); // 10–29 points per hotspot
    for (let i = 0; i < n; i++) {
      // Box-Muller transform → normal distribution
      const u1 = Math.max(rng(), 1e-9);
      const u2 = rng();
      const mag = Math.sqrt(-2 * Math.log(u1));
      const z1 = mag * Math.cos(2 * Math.PI * u2);
      const z2 = mag * Math.sin(2 * Math.PI * u2);

      // ~0.13 degrees ≈ 9 miles spread per cluster
      const spread = 0.13;
      const lat = hs.lat + z1 * spread;
      const lon = hs.lon + z2 * spread;

      // Discard out-of-bounds or out-of-radius points
      if (lat < south || lat > north || lon < west || lon > east) continue;
      if (haversineDistanceMiles(cLat, cLon, lat, lon) > radiusMiles) continue;

      // Intensity decays with distance from hotspot center
      const distFromHotspot = haversineDistanceMiles(hs.lat, hs.lon, lat, lon);
      const intensity = Math.min(
        1,
        hs.weight * Math.exp(-distFromHotspot / 12) * (0.5 + rng() * 0.5)
      );
      points.push({ lat, lon, intensity });
    }
  }

  return points;
}

/* ---------- constants ---------- */

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
const AUSTIN_CENTER: [number, number] = [30.2672, -97.7431];

const TEXAS_BOUNDS_PADDED = L.latLngBounds(
  L.latLng(24.0, -109.5),
  L.latLng(38.5, -90.5)
);

// Computed once at module load (local time)
const TODAY = getLocalToday();
const SEVEN_DAYS_AGO = getLocalDaysAgo(7);

/** Returns the date N days before yyyy-mm-dd (local time). */
function minusDays(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - days);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-");
}

/* ---------- Leaflet icons ---------- */

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

/* ---------- tile layers ---------- */

const topoLayer = L.tileLayer(
  `https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  }
);

/* ---------- MapCenterController ---------- */
function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const [lat, lon] = center;
    if (
      !prevRef.current ||
      prevRef.current[0] !== lat ||
      prevRef.current[1] !== lon
    ) {
      prevRef.current = center;
      map.flyTo(center, map.getZoom(), { duration: 0.8 });
    }
  }, [center, map]);

  return null;
}

/* ---------- Map legend overlay ---------- */
function MapLegend({
  showPastFires,
  showPredictions,
}: {
  showPastFires: boolean;
  showPredictions: boolean;
}) {
  if (!showPastFires && !showPredictions) return null;
  return (
    <div className="fixed bottom-14 left-4 z-[999] bg-white/90 rounded-lg shadow px-3 py-2 text-sm border border-gray-200 pointer-events-none">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Legend
      </div>
      {showPastFires && (
        <div className="flex items-center gap-2 mb-1">
          <img src="/images/fire-icon.webp" className="w-4 h-4" alt="" />
          <span className="text-xs text-gray-700">Past Fire Detection</span>
        </div>
      )}
      {showPredictions && (
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full border border-orange-600"
            style={{ backgroundColor: "rgba(237,137,54,0.75)" }}
          />
          <span className="text-xs text-gray-700">
            Predicted Risk
            <span className="text-gray-400 ml-1">(demo)</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- marker types ---------- */

type PredictionMarker = {
  lat: number;
  lon: number;
  date: string;
  regionName: string;
  probability: number;
  threshold: number;
  label: number;
  type: "prediction";
};

type FirmsMarker = {
  lat: number;
  lon: number;
  date: string;
  conf: number | null;
  sat: string | null;
  dn: string | null;
  type: "firms";
};

/* ========== Main page component ========== */

export default function WildfireMapPage() {
  /* ---- past fires state ---- */
  const [rawFirms, setRawFirms] = useState<FirmsMarker[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(false);
  const [pastFiresEnabled, setPastFiresEnabled] = useState(true);
  const [pastStart, setPastStart] = useState(SEVEN_DAYS_AGO);
  const [pastEnd, setPastEnd] = useState(TODAY);

  /* ---- prediction state ---- */
  const [predictionMarker, setPredictionMarker] =
    useState<PredictionMarker | null>(null);
  const [predLoading, setPredLoading] = useState(true);
  const [predEmpty, setPredEmpty] = useState(false);
  const [predictionsEnabled, setPredictionsEnabled] = useState(true);
  const [predictionDate, setPredictionDate] = useState(TODAY);

  /* ---- shared radius ---- */
  const [radiusMiles, setRadiusMiles] = useState(50);

  /* ---- UI state ---- */
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ---- region state ---- */
  const [selectedRegion, setSelectedRegion] = useState<string>("austin");
  const [currentRegionInfo, setCurrentRegionInfo] = useState<
    RegionInfo | undefined
  >();
  const [mapCenter, setMapCenter] = useState<[number, number]>(AUSTIN_CENTER);

  /* ---- region change handler ---- */
  const handleRegionChange = (
    slug: string,
    regionInfo: RegionInfo | undefined
  ) => {
    setSelectedRegion(slug);
    setCurrentRegionInfo(regionInfo);

    if (regionInfo) {

      setMapCenter([regionInfo.center.lat, regionInfo.center.lon]);
    }
  };
  /* ---- effect: set past-fire defaults from DB max available date ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadMaxFirmsDate() {
      try {
        const data = await fetchFirmsMaxDate();
        if (cancelled) return;

        const maxDate = data?.max_date;
        if (!maxDate) return;

        // Only auto-set if the user is still on the initial defaults
        const isDefaultRange = pastStart === SEVEN_DAYS_AGO && pastEnd === TODAY;
        if (!isDefaultRange) return;

        setPastEnd(maxDate);
        setPastStart(minusDays(maxDate, 7));
      } catch (err) {
        // fallback: keep TODAY/SEVEN_DAYS_AGO
        console.warn("Could not fetch FIRMS max_date:", err);
      }
    }

    loadMaxFirmsDate();
    return () => {
      cancelled = true;
    };
    // Run once on mount (global max_date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* ---- effect: fetch prediction when region or predictionDate changes ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadPrediction() {
      setPredLoading(true);
      setPredEmpty(false);

      const markerLat = currentRegionInfo?.center.lat ?? AUSTIN_CENTER[0];
      const markerLon = currentRegionInfo?.center.lon ?? AUSTIN_CENTER[1];
      const regionName = currentRegionInfo?.name ?? selectedRegion;

      // Use the user-selected prediction date (may be today or a future date)
      const dateToFetch = predictionDate || TODAY;

      try {
        const data = await fetchDailyFireRisk(dateToFetch, selectedRegion);
        if (cancelled) return;

        const champ = data.models.champion;
        setPredictionMarker({
          lat: markerLat,
          lon: markerLon,
          date: dateToFetch,
          regionName,
          probability: champ.prob ?? 0,
          threshold: champ.threshold,
          label: champ.label,
          type: "prediction",
        });
      } catch (err) {
        if (cancelled) return;
        console.warn("Prediction unavailable:", err);
        setPredictionMarker(null);
        setPredEmpty(true);
      } finally {
        if (!cancelled) setPredLoading(false);
      }
    }

    loadPrediction();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion, currentRegionInfo, predictionDate]);

  /* ---- effect: fetch past FIRMS when date range or region changes ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadFirms() {
      setFirmsLoading(true);

      const start = pastStart || SEVEN_DAYS_AGO;
      const end = pastEnd || TODAY;

      try {
        const data = await fetchRegionMapFirms(selectedRegion, start, end, {
          max: 8000,
        });
        if (cancelled) return;

        setRawFirms(
          data.items.map((f: any) => ({
            lat: f.latitude ?? f.lat,
            lon: f.longitude ?? f.lon,
            date: f.date,
            conf: f.conf ?? null,
            sat: f.sat ?? null,
            dn: f.dn ?? null,
            type: "firms" as const,
          }))
        );
      } catch (err) {
        if (cancelled) return;
        console.warn("FIRMS data unavailable:", err);
        setRawFirms([]);
      } finally {
        if (!cancelled) setFirmsLoading(false);
      }
    }

    loadFirms();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion, pastStart, pastEnd]);

  /* ---- client-side radius filter for past fires ---- */
  const visibleFirms = useMemo(() => {
    const centerLat = currentRegionInfo?.center.lat ?? AUSTIN_CENTER[0];
    const centerLon = currentRegionInfo?.center.lon ?? AUSTIN_CENTER[1];

    return rawFirms.filter((f) => {
      if (!f.lat || !f.lon) return false;
      return (
        haversineDistanceMiles(centerLat, centerLon, f.lat, f.lon) <=
        radiusMiles
      );
    });
  }, [rawFirms, radiusMiles, currentRegionInfo]);

  /* ---- demo prediction points (client-side, seeded RNG) ---- */
  // DEMO ONLY: stable pseudo-prediction points per region + date.
  // Replace with real prediction grid endpoint when available.
  const demoPoints = useMemo<DemoPoint[]>(() => {
    if (!predictionsEnabled || !currentRegionInfo) return [];
    return generateDemoPoints(currentRegionInfo, predictionDate, radiusMiles);
  }, [currentRegionInfo, predictionDate, radiusMiles, predictionsEnabled]);

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden" style={styles.container}>

      {sidebarOpen && (
        <div style={styles.sidebar}>
          <FilterSidebar
            selectedRegion={selectedRegion}
            onRegionChange={handleRegionChange}
            pastFiresEnabled={pastFiresEnabled}
            pastStart={pastStart}
            pastEnd={pastEnd}
            today={TODAY}
            onPastFiresToggle={setPastFiresEnabled}
            onPastStartChange={setPastStart}
            onPastEndChange={setPastEnd}
            predictionsEnabled={predictionsEnabled}
            predictionDate={predictionDate}
            onPredictionsToggle={setPredictionsEnabled}
            onPredictionDateChange={setPredictionDate}
            radiusMiles={radiusMiles}
            onRadiusChange={setRadiusMiles}
          />
        </div>
      )}


      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-3 right-3 z-[1000] border border-base-300 rounded-md px-2 py-1 text-sm shadow hover:bg-base-200"
        style={styles.buttons}
      >
        {sidebarOpen ? "← Hide" : "☰ Filters"}
      </button>

      {/* Map legend – positioned above the toggle button */}
      <MapLegend
        showPastFires={pastFiresEnabled}
        showPredictions={predictionsEnabled}
      />

      <div className="fixed top-[64px] h-[calc(100vh-64px)] left-0 w-full transition-all duration-300 ease-in-out">
        <MapContainer
          center={mapCenter}
          zoom={8}
          className="h-full w-full"
          layers={[topoLayer]}
          minZoom={5}
          maxZoom={20}
          maxBounds={TEXAS_BOUNDS_PADDED}
          maxBoundsViscosity={0.25}
        >
          <MapCenterController center={mapCenter} />

          {/* Past fire detection markers (red icon) */}
          {pastFiresEnabled &&
            !firmsLoading &&
            visibleFirms.map((f, idx) => (
              <Marker
                key={`firms-${idx}`}
                position={[f.lat, f.lon]}
                icon={fireIcon}
              >
                <Popup>
                  <strong>Past Fire Detection</strong>
                  <br />
                  <strong>Date:</strong> {f.date}
                  <br />
                  {f.sat && (
                    <>
                      <strong>Satellite:</strong> {f.sat}
                      <br />
                    </>
                  )}
                  {f.dn && (
                    <>
                      <strong>Day/Night:</strong> {f.dn}
                      <br />
                    </>
                  )}
                </Popup>
              </Marker>
            ))}

          {/* Demo prediction point cloud (orange circles, DEMO ONLY) */}
          {predictionsEnabled &&
            demoPoints.map((pt, idx) => (
              <CircleMarker
                key={`demo-${idx}`}
                center={[pt.lat, pt.lon]}
                radius={4 + pt.intensity * 6}
                pathOptions={{
                  color: "#c05621",
                  fillColor: "#ed8936",
                  fillOpacity: 0.35 + pt.intensity * 0.45,
                  weight: 0.5,
                }}
              />
            ))}

          {/* Model-based prediction pin (orange icon) – shows ML model output */}
          {predictionsEnabled && !predLoading && predictionMarker && (
            <Marker
              key="prediction"
              position={[predictionMarker.lat, predictionMarker.lon]}
              icon={predictIcon}
            >
              <Popup>
                <strong>Predicted Fire Risk</strong>
                <br />
                <strong>Region:</strong> {predictionMarker.regionName}
                <br />
                <strong>Date:</strong> {predictionMarker.date}
                <br />
                {/* <strong>Probability:</strong>{" "}
                {(predictionMarker.probability * 100).toFixed(1)}%
                <br />
                <strong>Threshold:</strong>{" "}
                {predictionMarker.threshold.toFixed(2)} */}
                const prob =
                  typeof predictionMarker?.probability === "number"
                    ? (predictionMarker.probability * 100).toFixed(1)
                    : "—";

                const thresh =
                  typeof predictionMarker?.threshold === "number"
                    ? predictionMarker.threshold.toFixed(2)
                    : "—";
                <br />
                <strong>Risk:</strong>{" "}
                {predictionMarker.label === 1 ? "⚠️ High" : "✓ Low"}
                <br />
                <em className="text-xs text-gray-400">
                  Hotspot cloud is demo only
                </em>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {predEmpty && !predLoading && (
        <div className="fixed bottom-14 right-4 z-[999] bg-white/90 rounded-lg shadow px-3 py-2 text-sm text-gray-600 border border-gray-200">
          No prediction data available for this date.
        </div>
      )}
    </div>
  );
}
