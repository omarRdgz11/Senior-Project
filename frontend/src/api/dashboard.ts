/// <reference types="vite/client" />

/* ================== Types ================== */
export type FireOverview = {
  fires_last_24h: number;
  drivers: {
    avg_humidity: number;
    avg_wind: number;
  };
  score: number;
  label: "Low" | "Elevated" | "High";
};

export type WeatherOverview = {
  datetime: string;
  tempmax: number;
  tempmin: number;
  humidity: number;
  windspeed: number;
  precip: number;
};

export type DashboardOverview = {
  date: string;
  region: string;
  risk: FireOverview;
  weather?: WeatherOverview | null;
};

export type WeatherDailyResponse = {
  range: { start: string; end: string };
  count: number;
  items: WeatherOverview[];
};

export type WeatherSummaryResponse = {
  range: { start: string; end: string };
  avg_tempmax: number;
  avg_tempmin: number;
  avg_humidity: number;
  avg_windspeed: number;
  total_precip: number;
};

export type FiresDailyResponse = {
  range: { start: string; end: string };
  count: number;
  items: { date: string; fires: number }[];
};

export type FiresSummaryResponse = {
  range: { start: string; end: string };
  total_fires: number;
  fires_last_24h: number;
};

export type WatchlistItem = {
  name: string;
  risk: string;
  hotspots: number;
  windspeed: number;
  humidity: number;
};

export type WatchlistResponse = {
  date: string;
  items: WatchlistItem[];
};

export type InsightsResponse = {
  range: {
    start: string;
    end: string;
  };
  messages: string[];
};

/* ================== Core fetch wrapper (re-use from predict.ts) ================== */
async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Non-JSON response: ${text}`);
  }
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:5005").replace(/\/+$/, "");

/* ================== Public API ================== */

/**
 * GET /api/dashboard/overview
 */
export async function fetchDashboardOverview(date: string): Promise<DashboardOverview> {
  const url = `${API_BASE}/api/dashboard/overview?date=${date}`;
  return fetchJSON(url);
}

/**
 * GET /api/dashboard/weather/daily?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function fetchWeatherDaily(
  start: string,
  end: string
): Promise<WeatherDailyResponse> {
  const qs = new URLSearchParams({ start, end });
  const url = `${API_BASE}/api/dashboard/weather/daily?${qs.toString()}`;
  return fetchJSON(url);
}

/** 
 * GET /api/dashboard/weather/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function fetchWeatherSummary(
  start: string,
  end: string
): Promise<WeatherSummaryResponse> {
  const qs = new URLSearchParams({ start, end });
  const url = `${API_BASE}/api/dashboard/weather/summary?${qs.toString()}`;
  return fetchJSON(url);
}

/** 
 * GET /api/dashboard/fires/daily?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function fetchFiresDaily(
  start: string,
  end: string
): Promise<FiresDailyResponse> {
  const qs = new URLSearchParams({ start, end });
  const url = `${API_BASE}/api/dashboard/fires/daily?${qs.toString()}`;
  return fetchJSON(url);
}

/** 
 * GET /api/dashboard/fires/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function fetchFiresSummary(
  start: string,
  end: string
): Promise<FiresSummaryResponse> {
  const qs = new URLSearchParams({ start, end });
  const url = `${API_BASE}/api/dashboard/fires/summary?${qs.toString()}`;
  return fetchJSON(url);
}

/**
 *  GET /api/dashboard/watchlist?date=YYYY-MM-DD
 */
export async function fetchWatchlist(date: string): Promise<WatchlistResponse> {
  const url = `${API_BASE}/api/dashboard/watchlist?date=${date}`;
  return fetchJSON(url);
}

export async function fetchInsights(
  start: string, 
  end: string
): Promise<InsightsResponse> {
  const qs = new URLSearchParams({ start, end });
  const url = `${API_BASE}/api/dashboard/insights?${qs.toString()}`;
  return fetchJSON(url);
}
