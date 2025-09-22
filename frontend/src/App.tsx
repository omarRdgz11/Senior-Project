import { useEffect, useState } from "react"
import "./index.css"

// If your backend returns { id, text }, change this to { id:number; text:string }
type HelloRow = { id: number; msg: string }

export default function App() {
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "error">("unknown")
  const [dark, setDark] = useState(false)

  const [helloRows, setHelloRows] = useState<HelloRow[]>([])
  const [helloLoading, setHelloLoading] = useState(false)
  const [helloError, setHelloError] = useState<string | null>(null)

  // Activate daisyUI theme (retro <-> business)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "business" : "retro"
  }, [dark])

  // Quick ping to confirm backend is reachable through the Vite proxy
  useEffect(() => {
    fetch("/api/ping")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"))
  }, [])

  const loadHello = async () => {
    setHelloLoading(true)
    setHelloError(null)
    try {
      const res = await fetch("/api/hello")
      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        throw new Error(`HTTP ${res.status} – ${txt || "Failed to load /api/hello"}`)
      }
      const data: { rows: HelloRow[] } = await res.json()
      setHelloRows(data.rows || [])
    } catch (err: any) {
      setHelloRows([])
      setHelloError(err?.message || "Unknown error")
    } finally {
      setHelloLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold">Fire (FIRMS) Detection — Dev Stack</h1>

        {/* Card */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body space-y-4">
            <p>
              Backend API status:{" "}
              <span
                className={
                  apiStatus === "ok"
                    ? "text-success"
                    : apiStatus === "error"
                    ? "text-error"
                    : "text-base-content/60"
                }
              >
                {apiStatus}
              </span>
            </p>

            {/* Actions + theme toggle */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className={`btn btn-primary ${helloLoading ? "btn-disabled" : ""}`}
                onClick={loadHello}
                disabled={helloLoading}
              >
                {helloLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Loading…
                  </>
                ) : (
                  "Load Hello Rows"
                )}
              </button>

              <label className="flex items-center gap-3">
                <span>Dark theme</span>
                {/* daisyUI toggle */}
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={dark}
                  onChange={(e) => setDark(e.target.checked)}
                />
              </label>
            </div>

            {/* Error */}
            {helloError && (
              <div className="alert alert-error">
                <span>Error loading /api/hello: {helloError}</span>
              </div>
            )}

            {/* Data table */}
            {helloRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {helloRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{/* if your API returns 'text', use r.text instead of r.msg */}
                          {r.msg}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty state */}
            {!helloLoading && !helloError && helloRows.length === 0 && (
              <p className="text-sm text-base-content/70">No rows loaded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
