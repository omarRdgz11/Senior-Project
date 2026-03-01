// src/api/evacuation.ts
/// <reference types="vite/client" />

/* ================== Types ================== */
export interface EvacuationRequest {
    lat: number;
    lng: number;
    /** When true, forces evacuation scenario for demos (simulated high risk) */
    demo?: boolean;
}

export interface SafeZone {
    latitude: number;
    longitude: number;
    direction: string;
    distance_miles: number;
    risk_level: number;
}

export interface RouteData {
    geometry: any;  // GeoJSON LineString — Leaflet reads this directly
    distance_miles: number;
    duration_minutes: number;
}

export interface EvacuationData {
    should_evacuate: boolean;
    current_risk: number;
    safe_zone: SafeZone | null;
    route: RouteData | null;
    message?: string;
}

/* ================== API base (matches predict.ts exactly) ================== */
declare global {
    interface Window {
        WILDSIGHT_API_BASE?: string;
    }
}

const envBase = import.meta.env.VITE_API_BASE;
const runtimeBase = typeof window !== "undefined" ? window.WILDSIGHT_API_BASE : undefined;
const API_BASE = (runtimeBase ?? envBase ?? "http://localhost:5005").replace(/\/+$/, "");

/* ================== Core fetch wrapper (matches predict.ts exactly) ================== */
const DEBUG = (import.meta.env.VITE_DEBUG ?? "true") !== "false";

function rid() { return Math.random().toString(36).slice(2, 8); }
function nowMs() { return typeof performance !== "undefined" ? performance.now() : Date.now(); }

async function fetchJSON(url: string, init?: RequestInit) {
    const id = rid();
    const t0 = nowMs();
    if (DEBUG) {
        console.groupCollapsed(`%c[${id}] → ${init?.method ?? "GET"} ${url}`, "color:#9cdcfe");
        console.debug("Request init:", init);
    }
    try {
        const res = await fetch(url, init);
        const txt = await res.text();
        if (DEBUG) {
            console.debug(`[${id}] status:`, res.status);
            console.debug(`[${id}] raw body:`, txt.slice(0, 400));
            console.debug(`[${id}] duration ms:`, Math.round(nowMs() - t0));
        }

        let json: any;
        try {
            json = txt ? JSON.parse(txt) : {};
        } catch {
            throw new Error(`Unexpected non-JSON response: ${txt.slice(0, 400)}`);
        }

        if (!res.ok) {
            throw new Error(typeof json?.error === "string" ? json.error : `HTTP ${res.status}`);
        }

        if (DEBUG) console.groupEnd();
        return json;
    } catch (err) {
        if (DEBUG) { console.error("[WildSight]", err); console.groupEnd(); }
        throw err;
    }
}

/* ================== Public API ================== */

/**
 * POST /api/evacuation-route
 * Takes user's lat/lng, returns risk score + safe zone + driving route
 */
// export async function getEvacuationRoute(
//     location: EvacuationRequest,
//     options?: { demo?: boolean }
// ): Promise<EvacuationData> {
//     const payload = { ...location };
//     if (options?.demo) payload.demo = true;
//     const url = `/api/evacuation-route`;  // bypasses API_BASE entirely
//     return fetchJSON(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//     });
// }

export async function getEvacuationRoute(
    location: { lat: number; lng: number },
    options?: { demo?: boolean }
  ) {
    console.log("📡 Sending to backend:", {
      lat: location.lat,
      lng: location.lng,
      demo: options?.demo
    });
  
    const response = await fetch("/api/evacuation-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        demo: options?.demo
      })
    });
  
    const data = await response.json();
  
    console.log("Backend response:", data);
  
    if (!response.ok) {
      throw new Error(data.error || "Evacuation request failed");
    }
  
    return data;
  }