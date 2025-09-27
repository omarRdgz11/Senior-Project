import { useEffect, useMemo, useState } from "react";
import { listRawDetections, type RawDetection } from "../api/Map/Raw_Detections/rawDetections";

type SortKey = "acq_datetime_desc" | "acq_datetime_asc" | "frp_desc" | "frp_asc";

export default function TestRawDetections() {
  // filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [timeofday, setTimeofday] = useState<string>(""); // "D" | "N" | ""
  const [confidence, setConfidence] = useState<string>(""); // low, nominal, high (comma OK)
  const [satellite, setSatellite] = useState<string>("");   // N, J, N21 (comma OK)
  const [sort, setSort] = useState<SortKey>("acq_datetime_desc");
  const [limit, setLimit] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  // state
  const [items, setItems] = useState<RawDetection[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [totalFromHeader, setTotalFromHeader] = useState<string | undefined>(undefined);

  const params = useMemo(
    () => ({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      timeofday: timeofday || undefined,
      confidence: confidence || undefined,
      satellite: satellite || undefined,
      sort,
      limit,
      page
    }),
    [startDate, endDate, timeofday, confidence, satellite, sort, limit, page]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listRawDetections(params);
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
        setElapsedMs(0);              // or measure locally if you want
        setTotalFromHeader(undefined); // nothing from header in this path
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
        setItems([]);
        setTotal(0);
        setPages(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const canPrev = page > 1;
  const canNext = page < pages;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Raw Detections — API Test</h1>

      {/* Status card */}
      <div className="rounded-2xl border border-base-300 p-4 bg-base-100 shadow">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded-full border">
            {loading ? "Loading…" : error ? "Error" : "OK"}
          </span>
          <span>Rows: <strong>{items.length}</strong> / total: <strong>{total}</strong></span>
          {totalFromHeader && <span>header total: <strong>{totalFromHeader}</strong></span>}
          <span>time: <strong>{elapsedMs.toFixed(1)} ms</strong></span>
          <span>page: <strong>{page}</strong> of <strong>{pages}</strong></span>
        </div>
        {error && <p className="mt-2 text-error text-sm break-all">{error}</p>}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-base-300 p-4 bg-base-100 shadow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Start date</label>
          <input type="date" className="input input-bordered w-full"
            value={startDate} onChange={e => { setPage(1); setStartDate(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm mb-1">End date</label>
          <input type="date" className="input input-bordered w-full"
            value={endDate} onChange={e => { setPage(1); setEndDate(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm mb-1">Time of day</label>
          <select className="select select-bordered w-full"
            value={timeofday} onChange={e => { setPage(1); setTimeofday(e.target.value); }}>
            <option value="">Any</option>
            <option value="D">Day (D)</option>
            <option value="N">Night (N)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Confidence (comma OK)</label>
          <input className="input input-bordered w-full" placeholder="low,nominal,high"
            value={confidence} onChange={e => { setPage(1); setConfidence(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm mb-1">Satellite (comma OK)</label>
          <input className="input input-bordered w-full" placeholder="N,J,N21"
            value={satellite} onChange={e => { setPage(1); setSatellite(e.target.value); }} />
        </div>
        <div>
          <label className="block text-sm mb-1">Sort</label>
          <select className="select select-bordered w-full"
            value={sort} onChange={e => setSort(e.target.value as SortKey)}>
            <option value="acq_datetime_desc">Newest first</option>
            <option value="acq_datetime_asc">Oldest first</option>
            <option value="frp_desc">FRP desc</option>
            <option value="frp_asc">FRP asc</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Limit</label>
          <input type="number" min={1} max={1000} className="input input-bordered w-full"
            value={limit} onChange={e => { setPage(1); setLimit(Number(e.target.value || 25)); }} />
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button className="btn" disabled={!canPrev || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
        <button className="btn" disabled={!canNext || loading} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
        <span className="text-sm opacity-70">Page {page} of {pages}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Time (UTC)</th>
              <th>Lat</th>
              <th>Lon</th>
              <th>FRP</th>
              <th>Bright TI4</th>
              <th>Sat</th>
              <th>Conf</th>
              <th>D/N</th>
            </tr>
          </thead>
          <tbody>
            {items.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.acq_date}</td>
                <td>{r.acq_time}</td>
                <td>{r.latitude.toFixed(4)}</td>
                <td>{r.longitude.toFixed(4)}</td>
                <td>{r.frp}</td>
                <td>{r.bright_ti4}</td>
                <td>{r.satellite}</td>
                <td className="capitalize">{r.confidence}</td>
                <td>{r.timeofday}</td>
              </tr>
            ))}
            {(!loading && items.length === 0) && (
              <tr><td colSpan={10} className="text-center opacity-70">No rows</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Raw JSON (first 1–2 rows) */}
      <details className="rounded-2xl border border-base-300 p-4 bg-base-100 shadow">
        <summary className="cursor-pointer">Debug: sample JSON</summary>
        <pre className="mt-3 text-xs whitespace-pre-wrap">
{JSON.stringify(items.slice(0, 2), null, 2)}
        </pre>
      </details>
    </div>
  );
}
