// src/pages/TestPages/DashboardTest.tsx
import React, { useEffect, useState } from "react";
import { styles as aboutStyles } from "../About/AboutPage.styles";

import {
  fetchDashboardOverview,
  fetchWatchlist,
  fetchInsights,
  type DashboardOverview,
  type WatchlistItem,
} from "../../api/dashboard";

/* ================== Local mock types (for sections not wired yet) ================== */

type FirmsPoint = {
  id: number;
  lat: number;
  lon: number;
  time: string;
  confidence: number;
  source: "VIIRS" | "MODIS";
};

type HourlyWeather = {
  hour: string;
  temp: number;
  wind: number; // km/h
  humidity: number; // %
};

const mockFirms: FirmsPoint[] = [
  { id: 1, lat: 30.31, lon: -97.75, time: "08:15", confidence: 92, source: "VIIRS" },
  { id: 2, lat: 30.42, lon: -97.63, time: "07:50", confidence: 88, source: "VIIRS" },
  { id: 3, lat: 30.18, lon: -97.82, time: "06:40", confidence: 73, source: "MODIS" },
  { id: 4, lat: 30.55, lon: -97.7, time: "05:10", confidence: 61, source: "VIIRS" },
];

const mockHourlyWeather: HourlyWeather[] = [
  { hour: "12:00", temp: 35, wind: 18, humidity: 22 },
  { hour: "14:00", temp: 36, wind: 22, humidity: 19 },
  { hour: "16:00", temp: 37, wind: 24, humidity: 17 },
  { hour: "18:00", temp: 34, wind: 20, humidity: 23 },
  { hour: "20:00", temp: 31, wind: 16, humidity: 28 },
  { hour: "22:00", temp: 29, wind: 14, humidity: 32 },
];

const riskBadge: Record<string, string> = {
  Low: "badge-success",
  Moderate: "badge-info",
  Elevated: "badge-warning",
  High: "badge-error",
};

// Helper to shift ISO date strings by N days
function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

// You may want to set this to a date you KNOW is in your DB:
const DEFAULT_DATE = new Date().toISOString().slice(0, 10);

/* ================== Component ================== */

export default function DashboardTest() {
  const [date, setDate] = useState<string>(DEFAULT_DATE);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      // For insights, use a small range ending at `date`
      const end = date;
      const start = shiftDate(date, -6); // last 7 days (inclusive)

      try {
        const [ov, wl, inRes] = await Promise.all([
          fetchDashboardOverview(date),
          fetchWatchlist(date),
          fetchInsights(start, end),
        ]);

        setOverview(ov);
        setWatchlist(wl.items);
        setInsights(inRes.messages);
      } catch (err: any) {
        console.error("Failed to load dashboard:", err);
        setError(err.message ?? "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [date]);

  const risk = overview?.risk;
  const weather = overview?.weather ?? null;

  const riskLabelBadgeClass = risk ? riskBadge[risk.label] ?? "badge-ghost" : "badge-ghost";

  return (
    <div
      className="space-y-6 w-full"
      style={{ ...aboutStyles.container, alignItems: "stretch" }}
    >
      {/* Header / Blurb */}
      <div className="card" style={aboutStyles.card}>
        <div className="card-body space-y-2">
          <h1 className="card-title" style={aboutStyles.title}>
            Operations Dashboard
          </h1>
          <p style={aboutStyles.text}>
            This view combines FIRMS-based fire activity and Open-Meteo weather summaries
            for Travis County. The top section and right-hand panels are powered by live
            backend routes under <code>/api/dashboard</code>, while the FIRMS table and
            hourly chart are still using placeholder values.
          </p>

          {/* Small date selector so you can test different days */}
          <div className="flex items-center gap-2 text-sm">
            <span style={aboutStyles.text}>Dashboard date:</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {loading && (
              <span className="text-xs" style={aboutStyles.text}>
                Loading…
              </span>
            )}
          </div>
          {error && (
            <div className="mt-2 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 xl:grid-cols-[2fr,1.1fr] w-full">
        {/* Left Column */}
        <div className="grid gap-4">
          {/* Top row: Risk + Snapshot */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Risk Card */}
            <div className="card" style={aboutStyles.card}>
              <div className="card-body space-y-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <div style={aboutStyles.subtitle}>
                      {overview?.region ?? "Travis County"}
                    </div>
                    <div className="text-xs" style={aboutStyles.text}>
                      Based on recent fire activity and same-day weather conditions
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold badge ${riskLabelBadgeClass}`}
                      style={{
                        ...aboutStyles.abtBtn,
                        // Let the badge color dominate, but keep rounded + font
                        backgroundColor: undefined,
                        borderColor: "transparent",
                        color: undefined,
                      }}
                    >
                      Overall Risk: {risk?.label ?? "—"}
                    </div>
                    <div className="text-[0.7rem] mt-1" style={aboutStyles.text}>
                      Date: {overview?.date ?? date}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 items-end">
                  <div>
                    <div
                      style={{
                        ...aboutStyles.title,
                        fontSize: "2.3rem",
                        marginBottom: 0,
                      }}
                    >
                      {risk ? risk.score.toFixed(2) : "—"}
                    </div>
                    <div className="text-xs" style={aboutStyles.text}>
                      Composite probability (0–1)
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div style={aboutStyles.text}>
                      • {risk?.fires_last_24h ?? "—"} hotspots in last 24h (daily aggregate)
                    </div>
                    <div style={aboutStyles.text}>
                      • Avg humidity driver:{" "}
                      {risk ? `${risk.drivers.avg_humidity}%` : "—"}
                    </div>
                    <div style={aboutStyles.text}>
                      • Avg wind driver:{" "}
                      {risk ? `${risk.drivers.avg_wind} km/h` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Snapshot */}
            <div className="card" style={aboutStyles.card}>
              <div className="card-body space-y-2">
                <div className="flex justify-between items-center">
                  <div style={aboutStyles.subtitle}>Current Conditions</div>
                  <div className="text-[0.65rem]" style={aboutStyles.text}>
                    From Open-Meteo daily feed
                  </div>
                </div>

                {weather ? (
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div
                        style={{
                          ...aboutStyles.title,
                          fontSize: "1.9rem",
                          marginBottom: 0,
                        }}
                      >
                        {weather.tempmax != null ? `${weather.tempmax.toFixed(1)}°C` : "—"}
                      </div>
                      <div style={aboutStyles.text}>
                        Min:{" "}
                        {weather.tempmin != null ? `${weather.tempmin.toFixed(1)}°C` : "—"}
                      </div>
                    </div>
                    <div className="space-y-1" style={aboutStyles.text}>
                      <div>
                        Humidity:{" "}
                        {weather.humidity != null ? `${weather.humidity}%` : "—"}
                      </div>
                      <div>
                        Wind:{" "}
                        {weather.windspeed != null
                          ? `${weather.windspeed} km/h`
                          : "—"}
                      </div>
                      <div>Precip: {weather.precip != null ? `${weather.precip} mm` : "—"}</div>
                    </div>
                    <div className="space-y-1" style={aboutStyles.text}>
                      <div>Source: OpenMeteoWeather</div>
                      <div>Record: {weather.datetime?.slice(0, 10)}</div>
                      <div>RH &amp; wind feed risk score above</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs" style={aboutStyles.text}>
                    No weather data available for {date}. Try another date.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div className="flex justify-between items-center">
                <div style={aboutStyles.subtitle}>Fire Risk Map (Mock)</div>
                <div className="flex gap-2 text-[0.65rem]">
                  <button className="btn btn-xs" style={aboutStyles.abtBtn}>
                    Risk Layer
                  </button>
                  <button className="btn btn-xs" style={aboutStyles.abtBtn}>
                    FIRMS Points
                  </button>
                  <button className="btn btn-xs" style={aboutStyles.abtBtn}>
                    Weather Overlay
                  </button>
                </div>
              </div>
              <div
                className="mt-2 flex items-center justify-center text-[0.7rem]"
                style={{
                  ...aboutStyles.text,
                  borderRadius: "0.75rem",
                  borderStyle: "dashed",
                  borderWidth: "1px",
                  borderColor: aboutStyles.card.borderColor,
                  padding: "1.5rem",
                  backgroundColor: "#faf6ee",
                }}
              >
                Map placeholder — here we’ll render Leaflet/MapTiler with FIRMS detections and
                model probabilities.
              </div>
            </div>
          </div>

          {/* FIRMS + Hourly */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* FIRMS table (still mock) */}
            <div className="card" style={aboutStyles.card}>
              <div className="card-body space-y-2">
                <div className="flex justify-between items-center">
                  <div style={aboutStyles.subtitle}>Recent FIRMS Detections</div>
                  <div className="text-[0.65rem]" style={aboutStyles.text}>
                    Last 24 hours • placeholder
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Lat</th>
                        <th>Lon</th>
                        <th>Conf.</th>
                        <th>Src</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockFirms.map((p) => (
                        <tr key={p.id}>
                          <td>{p.time}</td>
                          <td>{p.lat.toFixed(2)}</td>
                          <td>{p.lon.toFixed(2)}</td>
                          <td>
                            <span
                              className={
                                "badge badge-xs " +
                                (p.confidence >= 80
                                  ? "badge-error"
                                  : p.confidence >= 60
                                  ? "badge-warning"
                                  : "badge-ghost")
                              }
                            >
                              {p.confidence}%
                            </span>
                          </td>
                          <td>{p.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Hourly conditions (still mock) */}
            <div className="card" style={aboutStyles.card}>
              <div className="card-body space-y-2">
                <div className="flex justify-between items-center">
                  <div style={aboutStyles.subtitle}>Hourly Trend (Mock)</div>
                  <div className="text-[0.65rem]" style={aboutStyles.text}>
                    Temp • Wind • Humidity
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-[0.7rem]">
                  {mockHourlyWeather.map((h) => (
                    <div key={h.hour} className="flex items-center gap-2">
                      <div className="w-12" style={aboutStyles.text}>
                        {h.hour}
                      </div>
                      <div className="w-10 font-semibold" style={aboutStyles.text}>
                        {h.temp}°C
                      </div>
                      <div className="w-16" style={aboutStyles.text}>
                        {h.wind} km/h
                      </div>
                      <div className="w-12" style={aboutStyles.text}>
                        {h.humidity}%
                      </div>
                      <div className="flex-1">
                        <div
                          style={{
                            height: "0.3rem",
                            borderRadius: "999px",
                            backgroundColor: "#b8c4a0",
                            width: `${(40 - h.humidity) * 2.5}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Watchlist / Insights / Alerts */}
        <div className="grid gap-4">
          {/* Watchlist (LIVE) */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div className="flex justify-between items-center">
                <div style={aboutStyles.subtitle}>Region Watchlist</div>
                <button className="btn btn-xs" style={aboutStyles.teamBtn}>
                  Manage AOIs
                </button>
              </div>
              <div className="space-y-2 text-[0.75rem]">
                {watchlist.length === 0 ? (
                  <div style={aboutStyles.text}>No regions available for this date.</div>
                ) : (
                  watchlist.map((w) => (
                    <div
                      key={w.name}
                      className="flex justify-between items-center px-2 py-2 rounded-xl"
                      style={{ backgroundColor: "#faf6ee" }}
                    >
                      <div>
                        <div
                          style={{
                            ...aboutStyles.subtitle,
                            fontSize: "0.9rem",
                            marginBottom: 0,
                          }}
                        >
                          {w.name}
                        </div>
                        <div style={aboutStyles.text}>
                          {w.hotspots} hotspots • Wind {w.windspeed} km/h • RH {w.humidity}%
                        </div>
                      </div>
                      <div>
                        <span className={`badge badge-sm ${riskBadge[w.risk] ?? "badge-ghost"}`}>
                          {w.risk}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Model Insights (LIVE) */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div style={aboutStyles.subtitle}>Model Insights</div>
              {insights.length === 0 ? (
                <div className="text-[0.75rem]" style={aboutStyles.text}>
                  No insights available for this range.
                </div>
              ) : (
                <ul className="list-disc list-inside text-[0.75rem]">
                  {insights.map((msg, idx) => (
                    <li key={idx} style={aboutStyles.text}>
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Alerts (still static for now) */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div style={aboutStyles.subtitle}>Alerts &amp; Tasks</div>
              <ul className="text-[0.75rem] space-y-1">
                <li style={aboutStyles.text}>
                  🔥 Review high-confidence cluster southwest of Austin.
                </li>
                <li style={aboutStyles.text}>
                  🌬️ Monitor evening wind shift; re-evaluate spread scenarios.
                </li>
                <li style={aboutStyles.text}>
                  📡 Confirm coverage for Hill Country sensors & ingest checks.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
