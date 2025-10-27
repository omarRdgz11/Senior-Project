// src/pages/ModelTest.tsx
import React, { useMemo, useState } from "react";
import {
  fetchFirms,
  gridPredict,
  predictPointGET,
  type FirmsResponse,
  type GridPredictResponse,
} from "../api/predict";

type Tab = "firms" | "point" | "grid";

// Austin-ish defaults
const DEFAULT_LAT = 30.2672;
const DEFAULT_LON = -97.7431;
const DEFAULT_DATE = "2023-08-15"; // pick any date you have weather for

// Rough bbox around Travis County (minLon,minLat,maxLon,maxLat)
const DEFAULT_BBOX = {
  minLon: -98.10,
  minLat: 30.05,
  maxLon: -97.40,
  maxLat: 30.60,
};

export default function ModelTest() {
  const [tab, setTab] = useState<Tab>("firms");

  // Shared inputs
  const [lat, setLat] = useState<number>(DEFAULT_LAT);
  const [lon, setLon] = useState<number>(DEFAULT_LON);
  const [date, setDate] = useState<string>(DEFAULT_DATE);

  // FIRMS inputs
  const [bbox, setBbox] = useState(DEFAULT_BBOX);
  const [start, setStart] = useState<string>("2024-06-01");
  const [end, setEnd] = useState<string>("2024-08-31");
  const [minConf, setMinConf] = useState<number>(50);
  const [maxPoints, setMaxPoints] = useState<number>(8000);

  // POINT inputs
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [threshold, setThreshold] = useState<number>(0.25);

  // GRID inputs
  const [stepDeg, setStepDeg] = useState<number>(0.05);
  const [gridRadiusKm, setGridRadiusKm] = useState<number>(25);

  // Results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firmsRes, setFirmsRes] = useState<FirmsResponse | null>(null);
  const [pointRes, setPointRes] = useState<any>(null);
  const [gridRes, setGridRes] = useState<GridPredictResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      if (tab === "firms") {
        const r = await fetchFirms({
          bbox,
          start,
          end,
          min_conf: minConf,
          max: maxPoints,
        });
        setFirmsRes(r);
      } else if (tab === "point") {
        const r = await predictPointGET({
          lat,
          lon,
          date,
          radius_km: radiusKm,
          threshold,
        });
        setPointRes(r);
      } else if (tab === "grid") {
        const r = await gridPredict({
          bbox,
          date,
          step_deg: stepDeg,
          radius_km: gridRadiusKm,
        });
        setGridRes(r);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const pretty = useMemo(() => {
    const obj =
      tab === "firms" ? firmsRes :
      tab === "point" ? pointRes :
      gridRes;
    return obj ? JSON.stringify(obj, null, 2) : "";
  }, [tab, firmsRes, pointRes, gridRes]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">WildSight API Test</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton active={tab === "firms"} onClick={() => setTab("firms")}>Past Fires</TabButton>
        <TabButton active={tab === "point"} onClick={() => setTab("point")}>Point Prediction</TabButton>
        <TabButton active={tab === "grid"} onClick={() => setTab("grid")}>Grid Prediction</TabButton>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shared card */}
        <Card title="Shared">
          <Field label="Date (ISO)">
            <input className="input input-bordered w-full" value={date} onChange={e => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </Field>
          <Field label="Lat">
            <input className="input input-bordered w-full" type="number" step="0.0001" value={lat} onChange={e => setLat(parseFloat(e.target.value))}/>
          </Field>
          <Field label="Lon">
            <input className="input input-bordered w-full" type="number" step="0.0001" value={lon} onChange={e => setLon(parseFloat(e.target.value))}/>
          </Field>
        </Card>

        {/* Tab-specific */}
        {tab === "firms" && (
          <Card title="FIRMS Filters">
            <Field label="Start (ISO)">
              <input className="input input-bordered w-full" value={start} onChange={e => setStart(e.target.value)} />
            </Field>
            <Field label="End (ISO)">
              <input className="input input-bordered w-full" value={end} onChange={e => setEnd(e.target.value)} />
            </Field>
            <Field label="Min Confidence">
              <input className="input input-bordered w-full" type="number" value={minConf} onChange={e => setMinConf(parseFloat(e.target.value))}/>
            </Field>
            <Field label="Max Points">
              <input className="input input-bordered w-full" type="number" value={maxPoints} onChange={e => setMaxPoints(parseInt(e.target.value) || 0)}/>
            </Field>
            <BBoxEditor bbox={bbox} onChange={setBbox} />
          </Card>
        )}

        {tab === "point" && (
          <Card title="Point Prediction">
            <Field label="Radius (km)">
              <input className="input input-bordered w-full" type="number" step="1" value={radiusKm} onChange={e => setRadiusKm(parseFloat(e.target.value))}/>
            </Field>
            <Field label="Threshold">
              <input className="input input-bordered w-full" type="number" step="0.01" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))}/>
            </Field>
          </Card>
        )}

        {tab === "grid" && (
          <Card title="Grid Prediction">
            <Field label="Step (deg)">
              <input className="input input-bordered w-full" type="number" step="0.01" value={stepDeg} onChange={e => setStepDeg(parseFloat(e.target.value))}/>
            </Field>
            <Field label="Radius (km)">
              <input className="input input-bordered w-full" type="number" step="1" value={gridRadiusKm} onChange={e => setGridRadiusKm(parseFloat(e.target.value))}/>
            </Field>
            <BBoxEditor bbox={bbox} onChange={setBbox} />
          </Card>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? "Loading..." : "Run"}
        </button>
        {error && <span className="text-error">Error: {error}</span>}
        {tab === "firms" && firmsRes && <span className="text-sm opacity-70">Returned: {firmsRes.count} points</span>}
        {tab === "grid" && gridRes && <span className="text-sm opacity-70">Cells: {gridRes.count}</span>}
        {tab === "point" && pointRes && <span className="text-sm opacity-70">p = {Number(pointRes?.probability ?? 0).toFixed(3)}</span>}
      </div>

      <pre className="p-4 rounded bg-base-200 overflow-auto text-sm max-h-[60vh]">
        {pretty || "Run a query to see JSON here."}
      </pre>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`btn ${active ? "btn-accent" : "btn-ghost"} px-4`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 space-y-3 shadow-sm">
      <div className="font-medium">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-control w-full">
      <div className="label">
        <span className="label-text">{label}</span>
      </div>
      {children}
    </label>
  );
}

function BBoxEditor({
  bbox,
  onChange,
}: {
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  onChange: (b: { minLon: number; minLat: number; maxLon: number; maxLat: number }) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="minLon">
        <input
          className="input input-bordered w-full"
          type="number"
          step="0.0001"
          value={bbox.minLon}
          onChange={(e) => onChange({ ...bbox, minLon: parseFloat(e.target.value) })}
        />
      </Field>
      <Field label="minLat">
        <input
          className="input input-bordered w-full"
          type="number"
          step="0.0001"
          value={bbox.minLat}
          onChange={(e) => onChange({ ...bbox, minLat: parseFloat(e.target.value) })}
        />
      </Field>
      <Field label="maxLon">
        <input
          className="input input-bordered w-full"
          type="number"
          step="0.0001"
          value={bbox.maxLon}
          onChange={(e) => onChange({ ...bbox, maxLon: parseFloat(e.target.value) })}
        />
      </Field>
      <Field label="maxLat">
        <input
          className="input input-bordered w-full"
          type="number"
          step="0.0001"
          value={bbox.maxLat}
          onChange={(e) => onChange({ ...bbox, maxLat: parseFloat(e.target.value) })}
        />
      </Field>
    </div>
  );
}
