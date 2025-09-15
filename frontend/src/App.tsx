import { useEffect, useState } from 'react'
import './index.css'
import { Switch } from '@skeletonlabs/skeleton-react'

type HelloRow = { id: number; msg: string }

function App() {
  const [apiStatus, setApiStatus] = useState<'unknown' | 'ok' | 'error'>('unknown')
  const [dark, setDark] = useState(false)

  const [helloRows, setHelloRows] = useState<HelloRow[]>([])
  const [helloLoading, setHelloLoading] = useState(false)
  const [helloError, setHelloError] = useState<string | null>(null)

  // Quick ping to confirm backend is reachable through the Vite proxy
  useEffect(() => {
    fetch('/api/ping')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(() => setApiStatus('ok'))
      .catch(() => setApiStatus('error'))
  }, [])

  const loadHello = async () => {
    setHelloLoading(true)
    setHelloError(null)
    try {
      const res = await fetch('/api/hello')
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} – ${txt || 'Failed to load /api/hello'}`)
      }
      const data: { rows: HelloRow[] } = await res.json()
      setHelloRows(data.rows || [])
    } catch (err: any) {
      setHelloRows([])
      setHelloError(err?.message || 'Unknown error')
    } finally {
      setHelloLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Fire (FIRMS) Detection — Dev Stack</h1>

        <div className="p-4 rounded-xl border bg-white space-y-4">
          <p>
            Backend API status:{' '}
            <span
              className={
                apiStatus === 'ok'
                  ? 'text-green-600'
                  : apiStatus === 'error'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }
            >
              {apiStatus}
            </span>
          </p>

          {/* Skeleton-styled button (class-based) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn preset-filled"
              onClick={loadHello}
              disabled={helloLoading}
            >
              {helloLoading ? 'Loading…' : 'Load Hello Rows'}
            </button>

            {/* Example Skeleton React component */}
            <div className="flex items-center gap-3">
              <span>Dark mode</span>
              <Switch
                name="dark"
                checked={dark}
                onCheckedChange={(e) => setDark(e.checked)}
              />
            </div>
          </div>

          {/* Error state */}
          {helloError && (
            <div className="text-sm text-red-600">
              Error loading /api/hello: {helloError}
              <div className="mt-1 text-gray-600">
                Tip: Make sure the <code>hello</code> table exists in Postgres.
              </div>
            </div>
          )}

          {/* Data table */}
          {helloRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border-b">ID</th>
                    <th className="px-3 py-2 border-b">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {helloRows.map((r) => (
                    <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-3 py-2 border-b">{r.id}</td>
                      <td className="px-3 py-2 border-b">{r.msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {!helloLoading && !helloError && helloRows.length === 0 && (
            <p className="text-sm text-gray-600">No rows loaded yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
