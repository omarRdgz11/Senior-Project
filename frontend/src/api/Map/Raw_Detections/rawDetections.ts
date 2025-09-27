// frontend/src/api/rawDetections.ts
export type RawDetection = {
  id: number;
  latitude: number;
  longitude: number;
  bright_ti4: number;
  acq_date: string; // "YYYY-MM-DD"
  acq_time: string; // "HH:MM:SS"
  satellite: string;
  confidence: string;
  frp: number;
  timeofday: "D" | "N";
};

export type ListResponse = {
  items: RawDetection[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5005/api";

export async function listRawDetections(
  params: Record<string, string | number | undefined> = {}
): Promise<ListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });

  const res = await fetch(`${BASE}/raw-detections?${qs.toString()}`);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${errText ? "- " + errText : ""}`);
  }
  return res.json() as Promise<ListResponse>;
}
