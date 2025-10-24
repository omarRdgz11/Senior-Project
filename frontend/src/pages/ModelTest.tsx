// src/pages/ModelTest.tsx
import React, { useEffect, useState } from "react";
import { postPredict, type PredictResponse } from "../api/predict";

type PayloadMeans = {
  rows: Record<string, number>[];
  threshold: number;
};

export default function ModelTest() {
  const [payload, setPayload] = useState<PayloadMeans | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PredictResponse | null>(null);

  // Load payload_means.json on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/payload_means.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PayloadMeans;
        setPayload(data);
      } catch (err: any) {
        setError(`Failed to load payload_means.json: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sendTest = async () => {
    if (!payload) return;
    setError(null);
    setResponse(null);
    try {
      const res = await postPredict(payload.rows, payload.threshold);
      setResponse(res);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  if (loading) return <p className="p-6 text-sm opacity-70">Loading payload_means.json…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Model API Test</h1>

      <div className="card bg-base-100 border border-base-200 shadow">
        <div className="card-body space-y-4">
          <button className="btn btn-primary btn-sm" onClick={sendTest}>
            Send Test Request
          </button>

          <details className="collapse bg-base-200">
            <summary className="collapse-title text-sm font-medium">
              View Payload ({Object.keys(payload?.rows?.[0] ?? {}).length} features)
            </summary>
            <pre className="collapse-content text-xs bg-base-100 p-3 rounded border overflow-x-auto">
{JSON.stringify(payload, null, 2)}
            </pre>
          </details>

          {error && <div className="alert alert-error">{error}</div>}

          {response && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium">Response</h2>
              <table className="table table-zebra w-full text-sm">
                <thead>
                  <tr><th>#</th><th>Probability</th><th>Fire Risk</th></tr>
                </thead>
                <tbody>
                  {response.results.map((r) => (
                    <tr key={r.index}>
                      <td>{r.index}</td>
                      <td>{r.probability.toFixed(4)}</td>
                      <td>{r.fire_risk ? "✅ true" : "❌ false"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <details className="collapse bg-base-200">
                <summary className="collapse-title text-sm font-medium">Raw JSON</summary>
                <pre className="collapse-content text-xs bg-base-100 p-3 rounded border overflow-x-auto">
{JSON.stringify(response, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
