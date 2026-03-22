// src/pages/Dashboard/DashboardTest.tsx
import React, { useEffect, useMemo, useState } from "react";
import { styles as aboutStyles } from "../About/AboutPage.styles";

import {
  fetchDashboardOverview,
  fetchWatchlist,
  fetchInsights,
  type DashboardOverview,
  type WatchlistItem,
} from "../../api/dashboard";
import { fetchRegionMapFirms, fetchRegionWeather, type RegionInfo, type RegionMapFirmsItem, type WeatherDailyRow } from "../../api/regions";
import { fetchDailyFireRisk } from "../../api/dailyFireRisk";
import RegionSelector from "../../components/RegionSelector";
import DashboardMiniMap, { type PredictionPin } from "../../components/DashboardMiniMap";

/* ================== Helpers ================== */

const riskBadge: Record<string, string> = {
  Low: "badge-success",
  Moderate: "badge-info",
  Elevated: "badge-warning",
  High: "badge-error",
};

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_DATE = new Date().toISOString().slice(0, 10);

/* ================== Component ================== */

export default function DashboardTest() {
  const [date, setDate] = useState<string>(DEFAULT_DATE);

  /* ---- region ---- */
  const [selectedRegion, setSelectedRegion] = useState<string>("austin");
  const [currentRegionInfo, setCurrentRegionInfo] = useState<RegionInfo | undefined>();

  /* ---- dashboard overview / watchlist / insights ---- */
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- FIRMS (real detections for table + map) ---- */
  const [firms, setFirms] = useState<RegionMapFirmsItem[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(false);
  const [firmsError, setFirmsError] = useState<string | null>(null);

  /* ---- 7-day weather trend (replaces hourly mock) ---- */
  const [weatherTrend, setWeatherTrend] = useState<WeatherDailyRow[]>([]);
  const [weatherTrendLoading, setWeatherTrendLoading] = useState(false);

  /* ---- ML prediction pin for mini map ---- */
  const [predPin, setPredPin] = useState<PredictionPin | null>(null);

  /* ---- effect: overview / watchlist / insights ---- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const end = date;
      const start = shiftDate(date, -6);
      try {
        const [ov, wl, inRes] = await Promise.all([
          fetchDashboardOverview(date, selectedRegion),
          fetchWatchlist(date),
          fetchInsights(start, end, selectedRegion),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setWatchlist(wl.items);
        setInsights(inRes.messages);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [date, selectedRegion]);

  /* ---- effect: FIRMS detections for the last 7 days ---- */
  useEffect(() => {
    let cancelled = false;
    async function loadFirms() {
      setFirmsLoading(true);
      setFirmsError(null);
      try {
        const start = shiftDate(date, -6);
        const res = await fetchRegionMapFirms(selectedRegion, start, date, { max: 200 });
        if (!cancelled) setFirms(res.items);
      } catch (err: any) {
        if (!cancelled) {
          setFirmsError(err.message ?? "Failed to load FIRMS data");
          setFirms([]);
        }
      } finally {
        if (!cancelled) setFirmsLoading(false);
      }
    }
    loadFirms();
    return () => { cancelled = true; };
  }, [date, selectedRegion]);

  /* ---- effect: 7-day weather trend ---- */
  useEffect(() => {
    let cancelled = false;
    async function loadWeatherTrend() {
      setWeatherTrendLoading(true);
      try {
        const start = shiftDate(date, -6);
        const res = await fetchRegionWeather(selectedRegion, start, date);
        if (!cancelled) setWeatherTrend(res.weather);
      } catch {
        if (!cancelled) setWeatherTrend([]);
      } finally {
        if (!cancelled) setWeatherTrendLoading(false);
      }
    }
    loadWeatherTrend();
    return () => { cancelled = true; };
  }, [date, selectedRegion]);

  /* ---- effect: ML prediction pin ---- */
  useEffect(() => {
    let cancelled = false;
    async function loadPrediction() {
      if (!currentRegionInfo) return;
      try {
        const res = await fetchDailyFireRisk(date, selectedRegion);
        if (cancelled) return;
        const champ = res.models.champion;
        setPredPin({
          lat: currentRegionInfo.center.lat,
          lon: currentRegionInfo.center.lon,
          probability: champ.prob ?? 0,
          label: champ.label,
          threshold: champ.threshold,
        });
      } catch {
        if (!cancelled) setPredPin(null);
      }
    }
    loadPrediction();
    return () => { cancelled = true; };
  }, [date, selectedRegion, currentRegionInfo]);

  /* ---- handlers ---- */
  const handleRegionChange = (slug: string, regionInfo: RegionInfo | undefined) => {
    setSelectedRegion(slug);
    setCurrentRegionInfo(regionInfo);
  };

  /* ---- derived ---- */
  const risk = overview?.risk;
  const weather = overview?.weather ?? null;
  const riskLabelBadgeClass = risk ? riskBadge[risk.label] ?? "badge-ghost" : "badge-ghost";

  /* ---- dynamic alerts from real risk data ---- */
  const dynamicAlerts = useMemo<string[]>(() => {
    if (!risk) return [];
    const alerts: string[] = [];

    if (risk.label === "High") {
      alerts.push(`🔥 High fire risk detected (score ${risk.score.toFixed(2)}). Review active hotspot areas immediately.`);
    } else if (risk.label === "Elevated") {
      alerts.push(`⚠️ Elevated fire risk (score ${risk.score.toFixed(2)}). Monitor conditions closely.`);
    }

    if (risk.drivers.avg_wind > 25) {
      alerts.push(`🌬️ Wind at ${risk.drivers.avg_wind} km/h may accelerate spread — re-evaluate spread scenarios.`);
    }

    if (risk.drivers.avg_humidity < 30) {
      alerts.push(`💧 Low humidity (${risk.drivers.avg_humidity}%) increases fire propagation risk.`);
    }

    if (predPin?.label === 1) {
      alerts.push(`📡 ML model predicts fire risk above threshold (${(predPin.probability * 100).toFixed(1)}% probability).`);
    }

    if (firms.length > 0 && !firmsLoading) {
      alerts.push(`📍 ${firms.length} FIRMS detection(s) recorded in ${overview?.region ?? selectedRegion} over the last 7 days.`);
    }

    if (alerts.length === 0) {
      alerts.push(`✓ Conditions appear stable (risk score ${risk.score.toFixed(2)}). Continue routine monitoring.`);
    }

    return alerts;
  }, [risk, predPin, firms, firmsLoading, overview, selectedRegion]);

  return (
    <div
      className="space-y-6 w-full"
      style={{ ...aboutStyles.container, alignItems: "stretch" }}
    >
      {/* Header */}
      <div className="card" style={aboutStyles.card}>
        <div className="card-body space-y-2">
          <h1 className="card-title" style={aboutStyles.title}>
            Operations Dashboard
          </h1>
          <p style={aboutStyles.text}>
            Live FIRMS satellite detections, weather conditions, and ML model predictions
            for the selected region. All panels are powered by live backend data.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span style={aboutStyles.text}>Region:</span>
            <RegionSelector
              value={selectedRegion}
              onChange={handleRegionChange}
              className="select-sm w-40"
            />
            <span style={aboutStyles.text}>Date:</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {loading && (
              <span className="text-xs" style={aboutStyles.text}>Loading…</span>
            )}
          </div>

          {error && (
            <div className="mt-2 text-xs text-red-600">{error}</div>
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
                      {overview?.region ?? "—"}
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
                    Regional daily weather
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
                        {weather.windspeed != null ? `${weather.windspeed} km/h` : "—"}
                      </div>
                      <div>
                        Precip: {weather.precip != null ? `${weather.precip} mm` : "—"}
                      </div>
                    </div>
                    <div className="space-y-1" style={aboutStyles.text}>
                      <div>Source: Weather DB</div>
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

          {/* Fire Risk Map (real Leaflet) */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div className="flex justify-between items-center">
                <div style={aboutStyles.subtitle}>Fire Risk Map</div>
                <div className="text-[0.65rem]" style={aboutStyles.text}>
                  {firmsLoading
                    ? "Loading detections…"
                    : `${firms.length} FIRMS points • 7 days`}
                </div>
              </div>

              {currentRegionInfo ? (
                <DashboardMiniMap
                  regionInfo={currentRegionInfo}
                  firms={firms}
                  predictionPin={predPin}
                />
              ) : (
                <div
                  className="flex items-center justify-center text-[0.7rem]"
                  style={{
                    height: "300px",
                    borderRadius: "0.75rem",
                    borderStyle: "dashed",
                    borderWidth: "1px",
                    borderColor: aboutStyles.card.borderColor,
                    backgroundColor: "#faf6ee",
                    ...aboutStyles.text,
                  }}
                >
                  Loading map…
                </div>
              )}
            </div>
          </div>

          {/* FIRMS table + 7-day weather trend */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* FIRMS table (real data) */}
            <div className="card" style={aboutStyles.card}>
              <div className="card-body space-y-2">
                <div className="flex justify-between items-center">
                  <div style={aboutStyles.subtitle}>Recent FIRMS Detections</div>
                  <div className="text-[0.65rem]" style={aboutStyles.text}>
                    Last 7 days · up to 10 shown
                  </div>
                </div>

                {firmsLoading ? (
                  <div className="text-xs" style={aboutStyles.text}>Loading…</div>
                ) : firmsError ? (
                  <div className="text-xs text-red-500">{firmsError}</div>
                ) : firms.length === 0 ? (
                  <div className="text-xs" style={aboutStyles.text}>
                    No FIRMS detections for this region and date range.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-xs">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Lat</th>
                          <th>Lon</th>
                          <th>Conf.</th>
                          <th>Src</th>
                        </tr>
                      </thead>
                      <tbody>
                        {firms.slice(0, 10).map((f, idx) => {
                          const conf = f.conf ?? 0;
                          return (
                            <tr key={idx}>
                              <td>{f.date?.slice(5)}</td>
                              <td>{f.lat.toFixed(2)}</td>
                              <td>{f.lon.toFixed(2)}</td>
                              <td>
                                <span
                                  className={
                                    "badge badge-xs " +
                                    (conf >= 80
                                      ? "badge-error"
                                      : conf >= 60
                                      ? "badge-warning"
                                      : "badge-ghost")
                                  }
                                >
                                  {Math.round(conf)}%
                                </span>
                              </td>
                              <td>{f.sat ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 7-day weather trend (real data, replaces hourly mock) */}
            <div className="card" style={aboutStyles.card}>
              <div className="card-body space-y-2">
                <div className="flex justify-between items-center">
                  <div style={aboutStyles.subtitle}>7-Day Conditions Trend</div>
                  <div className="text-[0.65rem]" style={aboutStyles.text}>
                    Temp • Wind • Humidity
                  </div>
                </div>

                {weatherTrendLoading ? (
                  <div className="text-xs" style={aboutStyles.text}>Loading…</div>
                ) : weatherTrend.length === 0 ? (
                  <div className="text-xs" style={aboutStyles.text}>
                    No weather trend data available.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-[0.7rem]">
                    {[...weatherTrend].reverse().map((h) => {
                      const humidity = h.humidity ?? 50;
                      return (
                        <div key={h.date} className="flex items-center gap-2">
                          <div className="w-16 text-[0.65rem]" style={aboutStyles.text}>
                            {h.date?.slice(5)}
                          </div>
                          <div className="w-12 font-semibold" style={aboutStyles.text}>
                            {h.tempmax != null ? `${h.tempmax.toFixed(0)}°C` : "—"}
                          </div>
                          <div className="w-16" style={aboutStyles.text}>
                            {h.windspeed != null ? `${h.windspeed.toFixed(0)} km/h` : "—"}
                          </div>
                          <div className="w-12" style={aboutStyles.text}>
                            {h.humidity != null ? `${h.humidity.toFixed(0)}%` : "—"}
                          </div>
                          <div className="flex-1">
                            <div
                              style={{
                                height: "0.3rem",
                                borderRadius: "999px",
                                backgroundColor: "#b8c4a0",
                                width: `${Math.min(100, Math.max(0, (100 - humidity) * 1.5))}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Watchlist / Insights / Alerts */}
        <div className="grid gap-4">
          {/* Watchlist (all regions, live) */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div className="flex justify-between items-center">
                <div style={aboutStyles.subtitle}>Region Watchlist</div>
                <div className="text-[0.65rem]" style={aboutStyles.text}>
                  All monitored regions
                </div>
              </div>
              <div className="space-y-2 text-[0.75rem]">
                {watchlist.length === 0 ? (
                  <div style={aboutStyles.text}>No regions available for this date.</div>
                ) : (
                  watchlist.map((w) => (
                    <div
                      key={w.slug ?? w.name}
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
                          {w.hotspots} hotspots · Wind {w.windspeed} km/h · RH {w.humidity}%
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

          {/* Model Insights (live) */}
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

          {/* Alerts — driven by real risk + prediction data */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div style={aboutStyles.subtitle}>Alerts &amp; Conditions</div>
              {dynamicAlerts.length === 0 ? (
                <div className="text-[0.75rem]" style={aboutStyles.text}>
                  No data available for alerts.
                </div>
              ) : (
                <ul className="text-[0.75rem] space-y-1">
                  {dynamicAlerts.map((msg, idx) => (
                    <li key={idx} style={aboutStyles.text}>
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
