// src/api/predict.ts
export type PredictRow = Record<string, number>;
export type PredictResponse = {
  results: Array<{ index: number; probability: number; fire_risk: boolean }>;
};

export type FeatureInfo = {
  feature_names: string[];
  default_threshold: number;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5005";

/**
 * Optional helper — will succeed only if you implemented GET /api/predict/features
 * If the route doesn't exist, this will throw (caller should catch and fall back).
 */
export async function getPredictFeatures(): Promise<FeatureInfo> {
  const res = await fetch(`${API_BASE}/api/predict/features`);
  if (!res.ok) {
    throw new Error(`Features endpoint returned ${res.status}`);
  }
  return (await res.json()) as FeatureInfo;
}

/**
 * POST /api/predict
 * rows: array of 1+ feature objects (must include all required columns)
 * threshold: optional threshold override (defaults to model's own if not provided server-side)
 */
export async function postPredict(
  rows: PredictRow[],
  threshold?: number,
  fillMissingWithMeans?: boolean // only if you implemented the optional flag
): Promise<PredictResponse> {
  const body: any = { rows };
  if (typeof threshold === "number") body.threshold = threshold;
  if (fillMissingWithMeans) body.fill_missing_with_means = true;

  const res = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      // Bubble up API error details
      const msg = typeof json?.error === "string" ? json.error : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json as PredictResponse;
  } catch {
    // Not JSON or parse failed
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
    throw new Error(`Unexpected response: ${text.slice(0, 400)}`);
  }
}
