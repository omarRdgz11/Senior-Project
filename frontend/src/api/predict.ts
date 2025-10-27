// src/api/predict.ts
/// <reference types="vite/client" />

/* ================== Types ================== */
export type PredictRow = Record<string, number>;

export type PredictResult = {
  index: number;
  probability: number;
  fire_risk: boolean;
  threshold_used?: number;
  mode?: "raw-features" | "level2-autofill" | "level3-derived";
};

export type PredictResponse = { results: PredictResult[] };

export type FeatureInfo = {
  feature_names: string[];
  default_threshold: number;
};

/* ================== Debug helpers ================== */
const DEBUG = (import.meta.env.VITE_DEBUG ?? "true") !== "false";

function rid() {
  return Math.random().toString(36).slice(2, 8);
}

function nowMs() {
  return (typeof performance !== "undefined" ? performance.now() : Date.now());
}

function lg(...args: any[]) {
  if (DEBUG) console.log("[WildSight]", ...args);
}
function lgw(...args: any[]) {
  if (DEBUG) console.warn("[WildSight]", ...args);
}
function lge(...args: any[]) {
  if (DEBUG) console.error("[WildSight]", ...args);
}

/** Try to explain the classic opaque CORS/network error */
function corsHint(err: unknown, url: string) {
  const msg = String((err as any)?.message ?? err);
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return [
      `Fetch failed for ${url}`,
      "Possible causes:",
      "• Backend not running or wrong host:port",
      "• Dev proxy not applied (try calling '/api/...', not absolute http://...)",
      "• CORS blocked (if not using Vite proxy, ensure Flask-CORS for http://localhost:5173)",
      "• Docker: set DOCKER=true so proxy target = http://backend:5005",
    ].join("\n");
  }
  return null;
}

/* ================== API base resolution ================== */
// Priority (highest first):
// 1) window.WILDSIGHT_API_BASE (runtime override from console or app)
// 2) VITE_API_BASE env
// 3) default "http://localhost:5005"  (note: when using Vite proxy, use relative '/api')
declare global {
  interface Window {
    WILDSIGHT_API_BASE?: string;
  }
}

const envBase = import.meta.env.VITE_API_BASE;
const runtimeBase = typeof window !== "undefined" ? window.WILDSIGHT_API_BASE : undefined;

// If you’re using the Vite proxy, set VITE_API_BASE to "" and rely on relative /api paths.
// Otherwise keep it absolute to bypass proxy.
const API_BASE = (runtimeBase ?? envBase ?? "http://localhost:5005").replace(/\/+$/, "");

// One-time debug banner
(() => {
  if (!DEBUG) return;
  const env = {
    MODE: import.meta.env.MODE,
    VITE_API_BASE: envBase,
    RUNTIME_API_BASE: runtimeBase,
    RESOLVED_API_BASE: API_BASE,
  };
  console.groupCollapsed("%cWildSight API Debug", "color:#7aa7ff;font-weight:bold");
  console.table(env);
  if (API_BASE.startsWith("http")) {
    lg("Using ABSOLUTE base; Vite proxy is bypassed.");
  } else {
    lg("Using RELATIVE base; requests will go through Vite proxy.");
  }
  console.groupEnd();
})();

/* ================== Core fetch wrapper ================== */
async function fetchJSON(url: string, init?: RequestInit) {
  const id = rid();
  const t0 = nowMs();
  if (DEBUG) {
    console.groupCollapsed(`%c[${id}] → ${init?.method ?? "GET"} ${url}`, "color:#9cdcfe");
    console.debug("Request init:", init);
  }
  try {
    const res = await fetch(url, init);
    const txt = await res.text();
    const t1 = nowMs();

    if (DEBUG) {
      console.debug(`[${id}] status:`, res.status, res.statusText);
      console.debug(`[${id}] headers:`, Object.fromEntries(res.headers.entries()));
      console.debug(`[${id}] raw body:`, txt.slice(0, 400));
      console.debug(`[${id}] duration ms:`, Math.round(t1 - t0));
    }

    // Try JSON
    let json: any;
    try {
      json = txt ? JSON.parse(txt) : {};
    } catch (e) {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
      }
      throw new Error(`Unexpected non-JSON response: ${txt.slice(0, 400)}`);
    }

    if (!res.ok) {
      const msg = typeof json?.error === "string" ? json.error : `HTTP ${res.status}`;
      throw new Error(msg);
    }

    if (DEBUG) console.groupEnd();
    return json;
  } catch (err) {
    const hint = corsHint(err, url);
    if (hint) lgw(hint);
    lge(err);
    if (DEBUG) console.groupEnd();
    throw err;
  }
}

/* ================== Public API ================== */

/** Quick backend health probe (implement GET /health in Flask) */
export async function pingBackend(): Promise<{ ok: boolean; message?: string }> {
  const url = `${API_BASE}/health`;
  try {
    const json = await fetchJSON(url);
    return { ok: true, message: JSON.stringify(json) };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? String(e) };
  }
}

/**
 * Optional helper — will succeed only if you implemented GET /api/predict/features
 */
export async function getPredictFeatures(): Promise<FeatureInfo> {
  const url = `${API_BASE}/api/predict/features`;
  return fetchJSON(url);
}

/**
 * POST /api/predict (RAW features mode)
 */
export async function postPredict(
  rows: PredictRow[],
  threshold?: number,
  fillMissingWithMeans?: boolean
): Promise<PredictResponse> {
  const body: any = { rows };
  if (typeof threshold === "number") body.threshold = threshold;
  if (fillMissingWithMeans) body.fill_missing_with_means = true;

  const url = `${API_BASE}/api/predict`;
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * POINT/DATE prediction (Level-2 / Level-3 pathway)
 */
export async function predictPoint(
  lat: number,
  lon: number,
  isoDate: string,
  radiusKm = 25,
  autofillMissing = true,
  threshold?: number
): Promise<PredictResponse> {
  const body: any = {
    where: { lat, lon, radius_km: radiusKm },
    when: { date: isoDate },
    autofill_missing: autofillMissing,
  };
  if (typeof threshold === "number") body.threshold = threshold;

  const url = `${API_BASE}/api/predict`;
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Optional: features probe (if you added GET /api/features/derive)
 */
export async function deriveFeatures(
  lat: number,
  lon: number,
  isoDate: string,
  radiusKm = 25
): Promise<{
  features: Record<string, number | null>;
  complete: boolean;
  filled_with_means?: string[];
}> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    date: isoDate,
    radius_km: String(radiusKm),
  });
  const url = `${API_BASE}/api/features/derive?${params.toString()}`;
  return fetchJSON(url);
}

/* ---------- FIRMS (past fires) ---------- NEWEST ROUTES HERE */
export type FirmsItem = {
  lat: number;
  lon: number;
  date: string;   // ISO
  conf?: number;
  sat?: string;
  dn?: "D" | "N";
};
export type FirmsResponse = { count: number; items: FirmsItem[] };

export async function fetchFirms(params: {
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  start: string; // "YYYY-MM-DD"
  end: string;   // "YYYY-MM-DD"
  min_conf?: number; // default 0
  max?: number;      // default 5000
}): Promise<FirmsResponse> {
  const { bbox, start, end, min_conf = 0, max = 5000 } = params;
  const qs = new URLSearchParams({
    bbox: `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
    start,
    end,
    min_conf: String(min_conf),
    max: String(max),
  });
  const url = `${API_BASE}/api/firms?${qs.toString()}`;
  return fetchJSON(url);
}

/* ---------- GRID PREDICTION ---------- */
export type GridCell = { lat: number; lon: number; p: number };
export type GridPredictResponse = { count: number; items: GridCell[] };

export async function gridPredict(params: {
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  date: string;     // "YYYY-MM-DD"
  step_deg?: number;  // default 0.05
  radius_km?: number; // default 25
}): Promise<GridPredictResponse> {
  const { bbox, date, step_deg = 0.05, radius_km = 25 } = params;
  const qs = new URLSearchParams({
    bbox: `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
    date,
    step_deg: String(step_deg),
    radius_km: String(radius_km),
  });
  const url = `${API_BASE}/api/grid/predict?${qs.toString()}`;
  return fetchJSON(url);
}

/* ---------- POINT PREDICTION GET helper (optional, mirrors your POST) ---------- */
export async function predictPointGET(params: {
  lat: number;
  lon: number;
  date: string;       // "YYYY-MM-DD"
  radius_km?: number; // default 25
  threshold?: number; // optional
}) {
  const { lat, lon, date, radius_km = 25, threshold } = params;
  const qs = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    date,
    radius_km: String(radius_km),
  });
  if (typeof threshold === "number") qs.set("threshold", String(threshold));
  const url = `${API_BASE}/api/predict/point?${qs.toString()}`;
  return fetchJSON(url);
}

