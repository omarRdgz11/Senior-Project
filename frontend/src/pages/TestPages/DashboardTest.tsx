// src/pages/TestPages/DashboardTest.tsx
import React from "react";
import { styles as aboutStyles } from "../About/AboutPage.styles";

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

const watchlist = [
  { name: "Austin Metro", risk: "High", hotspots: 24, wind: 22, humidity: 18 },
  { name: "Hill Country West", risk: "Moderate", hotspots: 9, wind: 18, humidity: 24 },
  { name: "I-35 Corridor", risk: "Elevated", hotspots: 14, wind: 26, humidity: 16 },
];

const riskBadge: Record<string, string> = {
  Low: "badge-success",
  Moderate: "badge-info",
  Elevated: "badge-warning",
  High: "badge-error",
};

export default function DashboardTest() {
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
            This prototype shows how WildSight could combine FIRMS satellite detections
            and weather conditions into a single view for analysts in the Austin region.
            All values below are mock data, wired a placeholder while we finalize backend integration.
          </p>
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
                    <div style={aboutStyles.subtitle}>Austin Region (30km)</div>
                    <div className="text-xs" style={aboutStyles.text}>
                      Based on recent FIRMS detections & forecasted conditions
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        ...aboutStyles.abtBtn,
                        backgroundColor: "#b6402b",
                        borderColor: "#b6402b",
                        color: "#fff",
                      }}
                    >
                      Overall Risk: Elevated
                    </div>
                    <div className="text-[0.7rem] mt-1" style={aboutStyles.text}>
                      Updated 09:03 local
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
                      0.63
                    </div>
                    <div className="text-xs" style={aboutStyles.text}>
                      Composite probability (0–1)
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div style={aboutStyles.text}>
                      • 24 hotspots in last 24h within AOI
                    </div>
                    <div style={aboutStyles.text}>
                      • 8 high-confidence (&gt;80%) pixels
                    </div>
                    <div style={aboutStyles.text}>
                      • Warm, windy &amp; dry: favorable for spread if ignition occurs
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
                    Mock forecast feed
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div
                      style={{
                        ...aboutStyles.title,
                        fontSize: "1.9rem",
                        marginBottom: 0,
                      }}
                    >
                      36°C
                    </div>
                    <div style={aboutStyles.text}>Feels like 38°C</div>
                  </div>
                  <div className="space-y-1" style={aboutStyles.text}>
                    <div>Humidity: 19%</div>
                    <div>Wind: 22 km/h SW</div>
                    <div>Gusts: 28 km/h</div>
                  </div>
                  <div className="space-y-1" style={aboutStyles.text}>
                    <div>Pressure: 1009 hPa</div>
                    <div>UV Index: 8</div>
                    <div>Cloud Cover: 5%</div>
                  </div>
                </div>
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
                model probabilities
              </div>
            </div>
          </div>

          {/* FIRMS + Hourly */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* FIRMS table */}
            <div className="card" style={aboutStyles.card}>
              <div className="card-body space-y-2">
                <div className="flex justify-between items-center">
                  <div style={aboutStyles.subtitle}>Recent FIRMS Detections</div>
                  <div className="text-[0.65rem]" style={aboutStyles.text}>
                    Last 24 hours • mock
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

            {/* Hourly conditions */}
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
          {/* Watchlist */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div className="flex justify-between items-center">
                <div style={aboutStyles.subtitle}>Region Watchlist</div>
                <button className="btn btn-xs" style={aboutStyles.teamBtn}>
                  Manage AOIs
                </button>
              </div>
              <div className="space-y-2 text-[0.75rem]">
                {watchlist.map((w) => (
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
                        {w.hotspots} hotspots • Wind {w.wind} km/h • RH {w.humidity}%
                      </div>
                    </div>
                    <div>
                      <span className={`badge badge-sm ${riskBadge[w.risk]}`}>
                        {w.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Model Insights */}
          <div className="card" style={aboutStyles.card}>
            <div className="card-body space-y-2">
              <div style={aboutStyles.subtitle}>Model Insights (Mock)</div>
              <ul className="list-disc list-inside text-[0.75rem]">
                <li style={aboutStyles.text}>
                  Hotspots cluster along NW perimeter with overlapping low humidity.
                </li>
                <li style={aboutStyles.text}>
                  7-day fire activity is <strong>+18%</strong> vs seasonal baseline.
                </li>
                <li style={aboutStyles.text}>
                  Next 24h: elevated spread potential; prioritize Austin Metro AOI.
                </li>
              </ul>
            </div>
          </div>

          {/* Alerts */}
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
