// src/api/dailyFireRisk.ts
/// <reference types="vite/client" />

// One model's prediction output
export type DailyModelPrediction = {
  label: number;     // 0 or 1
  model: string;     // "CatBoost" or "RandomForest"
  prob: number;      // e.g. 0.0180
  threshold: number; // e.g. 0.25
};

// All models together (champion/shadow)
export type DailyFireRiskModels = {
  champion: DailyModelPrediction;
  shadow: DailyModelPrediction;

  //needed if we need to add more models in the future
  [key: string]: DailyModelPrediction;
};

// Full response from /api/improved/daily
export type DailyFireRiskResponse = {
  date: string; // "2024-06-15"

  // All engineered features for that day (we keep this generic)
  features_used: Record<string, number | string | boolean | null>;

  models: DailyFireRiskModels;
};

/* ========== API base (same style as your other API file) ========== */

declare global {
  interface Window {
    WILDSIGHT_API_BASE?: string;
  }
}

const envBase = import.meta.env.VITE_API_BASE;
const runtimeBase =
  typeof window !== "undefined" ? window.WILDSIGHT_API_BASE : undefined;

const API_BASE = (runtimeBase ?? envBase ?? "http://localhost:5005").replace(
  /\/+$/,
  ""
);

/* ========== Minimal JSON fetch helper ========== */

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response from backend: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }

  return data;
}

/* ========== Public function your map/frontend can call ========== */

/**
 * Wraps:
 *   GET /api/improved/daily?date=YYYY-MM-DD
 *
 * If `isoDate` is omitted, backend can default to today.
 */
export async function fetchDailyFireRisk(
  isoDate?: string
): Promise<DailyFireRiskResponse> {
  const params = new URLSearchParams();
  if (isoDate) params.set("date", isoDate);

  const url =
    `${API_BASE}/api/improved/daily` +
    (params.toString() ? `?${params.toString()}` : "");

  return fetchJSON(url);
}
