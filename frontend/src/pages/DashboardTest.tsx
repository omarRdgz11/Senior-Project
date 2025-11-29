import React, { useEffect, useState } from "react";
import {
  fetchDashboardOverview, type DashboardOverview,
  fetchWeatherDaily, type WeatherDailyResponse,
  fetchWeatherSummary, type WeatherSummaryResponse,
  fetchFiresDaily, type FiresDailyResponse,
  fetchFiresSummary, type FiresSummaryResponse
} from "../api/dashboard";

const DashboardTest: React.FC = () => {
  // --- Overview API state ---
  const [overviewDate, setOverviewDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // --- Weather API state ---
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummaryResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherDailyResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // --- Fire API state ---
  const [startDateFire, setStartDateFire] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDateFire, setEndDateFire] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fireData, setFireData] = useState<FiresDailyResponse | null>(null);
  const [fireSummary, setFireSummary] = useState<FiresSummaryResponse | null>(null);
  const [fireLoading, setFireLoading] = useState(false);
  const [fireError, setFireError] = useState<string | null>(null);

  // --- Functions ---
  const loadOverview = async (date: string) => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await fetchDashboardOverview(date);
      setOverview(data);
    } catch (err: any) {
      setOverviewError(err.message);
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const res = await fetchWeatherDaily(startDate, endDate);
      setWeatherData(res);
      const resSummary = await fetchWeatherSummary(startDate, endDate);
      setWeatherSummary(resSummary);
    } catch (err: any) {
      setWeatherError(err.message);
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  const loadFires = async () => {
    setFireLoading(true);
    setFireError(null);
    try {
      const res = await fetchFiresDaily(startDateFire, endDateFire);
      setFireData(res);
      const resSummary = await fetchFiresSummary(startDateFire, endDateFire);
      setFireSummary(resSummary);
    } catch (err: any) {
      setFireError(err.message);
      setFireData(null);
    } finally {
      setFireLoading(false);
    }
  };

  // --- Load default data on mount ---
  useEffect(() => {
    loadOverview(overviewDate);
    loadWeather();
    loadFires();
  }, []);

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Dashboard Test</h1>

      {/* --- Overview API section --- */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Overview API</h2>
        <label>Select Date: </label>
        <input
          type="date"
          value={overviewDate}
          onChange={(e) => setOverviewDate(e.target.value)}
        />
        <button style={{ marginLeft: "0.5rem" }} onClick={() => loadOverview(overviewDate)}>
          Fetch Overview
        </button>

        {overviewLoading && <p>Loading overview...</p>}
        {overviewError && <p style={{ color: "red" }}>Error: {overviewError}</p>}
        {!overviewLoading && !overviewError && overview && (
          <div>
            <p><strong>Date:</strong> {overview.date}</p>
            <p><strong>Region:</strong> {overview.region}</p>
            <h3>Fire Risk</h3>
            <p><strong>Score:</strong> {overview.risk.score}</p>
            <p><strong>Label:</strong> {overview.risk.label}</p>
            <p><strong>Fires last 24h:</strong> {overview.risk.fires_last_24h}</p>
            <p><strong>Drivers:</strong> Humidity {overview.risk.drivers.avg_humidity}%, Wind {overview.risk.drivers.avg_wind} km/h</p>

            {overview.weather && (
              <>
                <h3>Weather (overview)</h3>
                <p><strong>DateTime:</strong> {overview.weather.datetime}</p>
                <p><strong>Temp Max:</strong> {overview.weather.tempmax}°C</p>
                <p><strong>Temp Min:</strong> {overview.weather.tempmin}°C</p>
                <p><strong>Humidity:</strong> {overview.weather.humidity}%</p>
                <p><strong>Wind Speed:</strong> {overview.weather.windspeed} km/h</p>
                <p><strong>Precipitation:</strong> {overview.weather.precip} mm</p>
              </>
            )}
          </div>
        )}
      </section>

      {/* --- Weather Daily API section --- */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Weather Daily API</h2>
        <label>Start Date: </label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label style={{ marginLeft: "0.5rem" }}>End Date: </label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button style={{ marginLeft: "0.5rem" }} onClick={loadWeather}>
          Fetch Weather
        </button>

        {weatherLoading && <p>Loading weather...</p>}
        {weatherError && <p style={{ color: "red" }}>Error: {weatherError}</p>}

        {!weatherLoading && !weatherError && weatherData && (
          <div>
            <p>
              {weatherData.range.start} to {weatherData.range.end} — {weatherData.count} records found.
            </p>

            <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>DateTime</th>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Temp Max</th>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Temp Min</th>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Humidity</th>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Wind Speed</th>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Precip</th>
                </tr>
              </thead>
              <tbody>
                {weatherData.items.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.datetime}</td>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.tempmax}</td>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.tempmin}</td>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.humidity}</td>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.windspeed}</td>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.precip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!weatherLoading && !weatherError && weatherSummary && (
          <div style={{ marginTop: "1rem" }}>
            <h3>Weather Summary</h3>
            <p><strong>Date Range:</strong> {weatherSummary.range.start} to {weatherSummary.range.end}</p>
            <p><strong>Avg Temp Max:</strong> {weatherSummary.avg_tempmax}°C</p>
            <p><strong>Avg Temp Min:</strong> {weatherSummary.avg_tempmin}°C</p>
            <p><strong>Avg Humidity:</strong> {weatherSummary.avg_humidity}%</p>
            <p><strong>Avg Wind Speed:</strong> {weatherSummary.avg_windspeed} km/h</p>
            <p><strong>Total Precipitation:</strong> {weatherSummary.total_precip} mm</p>
          </div>
        )}
      </section>

      {/* --- Fires API section --- */}
      <section>
        <h2>Fires API</h2>
        <label>Start Date: </label>
        <input type="date" value={startDateFire} onChange={(e) => setStartDateFire(e.target.value)} />
        <label style={{ marginLeft: "0.5rem" }}>End Date: </label>
        <input type="date" value={endDateFire} onChange={(e) => setEndDateFire(e.target.value)} />
        <button style={{ marginLeft: "0.5rem" }} onClick={loadFires}>
          Fetch Fires
        </button>

        {fireLoading && <p>Loading fires...</p>}
        {fireError && <p style={{ color: "red" }}>Error: {fireError}</p>}

        {!fireLoading && !fireError && fireData && (
          <div>
            <p>{fireData.range.start} to {fireData.range.end} — {fireData.count} records found.</p>

            <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "1rem" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Date</th>
                  <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Fire Count</th>
                </tr>
              </thead>
              <tbody>
                {fireData.items.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.date}</td>
                    <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{row.fires}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!fireLoading && !fireError && fireSummary && (
          <div style={{ marginTop: "1rem" }}>
            <h3>Fires Summary</h3>
            <p><strong>Date Range:</strong> {fireSummary.range.start} to {fireSummary.range.end}</p>
            <p><strong>Total Fires:</strong> {fireSummary.total_fires}</p>
            <p><strong>Fires last 24h:</strong> {fireSummary.fires_last_24h}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardTest;
