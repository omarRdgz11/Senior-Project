// src/api/regions.ts
/// <reference types="vite/client" />

export type RegionInfo = {
  slug: string;
  name: string;
  center: { lat: number; lon: number };
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
};

export type RegionsResponse = {
  count: number;
  regions: RegionInfo[];
};

export type FireDailyRow = {
  date: string; // YYYY-MM-DD
  fire_count: number;
  avg_brightness: number | null;
  avg_confidence: number | null;
  avg_frp: number | null;
  label: number;
};

export type WeatherDailyRow = {
  date: string; // YYYY-MM-DD
  tempmax: number | null;
  tempmin: number | null;
  humidity: number | null;
  windspeed: number | null;
  precip: number | null;
};

export type RegionFiresResponse = {
  region: string;
  start: string;
  end: string;
  count: number;
  fires: FireDailyRow[];
};

export type RegionWeatherResponse = {
  region: string;
  start: string;
  end: string;
  count: number;
  weather: WeatherDailyRow[];
};

export type RegionMapFirmsItem = {
  lat: number;
  lon: number;
  date: string;
  conf: number | null;
  sat: string | null;
  dn: string | null;
};

export type RegionMapFirmsResponse = {
  region: string;
  count: number;
  items: RegionMapFirmsItem[];
};

/* ========== API base configuration ========== */

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

/* ========== JSON fetch helper ========== */

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

/* ========== Public API functions ========== */

/**
 * GET /api/regions
 * Fetches list of all available regions.
 */
export async function fetchRegions(): Promise<RegionsResponse> {
  const url = `${API_BASE}/api/regions`;
  return fetchJSON(url);
}

/**
 * GET /api/regions/<slug>/fires?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Fetches daily fire aggregates for a region.
 */
export async function fetchRegionFires(
  slug: string,
  start: string,
  end: string
): Promise<RegionFiresResponse> {
  const params = new URLSearchParams({ start, end });
  const url = `${API_BASE}/api/regions/${slug}/fires?${params}`;
  return fetchJSON(url);
}

/**
 * GET /api/regions/<slug>/weather?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Fetches daily weather for a region.
 */
export async function fetchRegionWeather(
  slug: string,
  start: string,
  end: string
): Promise<RegionWeatherResponse> {
  const params = new URLSearchParams({ start, end });
  const url = `${API_BASE}/api/regions/${slug}/weather?${params}`;
  return fetchJSON(url);
}

/**
 * GET /api/regions/<slug>/map-firms?start=YYYY-MM-DD&end=YYYY-MM-DD&min_conf=0&max=5000
 * Fetches FIRMS detections for a region (convenience endpoint using region bbox).
 */
export async function fetchRegionMapFirms(
  slug: string,
  start: string,
  end: string,
  options?: { minConf?: number; max?: number }
): Promise<RegionMapFirmsResponse> {
  const params = new URLSearchParams({ start, end });
  if (options?.minConf !== undefined) params.set("min_conf", String(options.minConf));
  if (options?.max !== undefined) params.set("max", String(options.max));

  const url = `${API_BASE}/api/regions/${slug}/map-firms?${params}`;
  return fetchJSON(url);
}
