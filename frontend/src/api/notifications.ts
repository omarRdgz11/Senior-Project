/// <reference types="vite/client" />

/* ================== Types ================== */

export type NotificationSubscriptionRequest = {
  phone_number: string;
  zip_code: string;
};

export type NotificationSubscriptionResponse = {
  message: string;
};

export type FireAlertRequest = {
  zip_code: string;
  fire_probability: number;
};

export type FireAlertResponse = {
  message: string;
  total?: number;
  users?: string[];
};


/* ================== Core fetch wrapper ================== */

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);

  const text = await res.text();

  let json;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response: ${text}`);
  }

  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

  return json;
}

const API_BASE =
  (import.meta.env.VITE_API_BASE ?? "http://localhost:5005")
    .replace(/\/+$/, "");


/* ================== Public API ================== */


/**
 * POST /api/notifications/subscribe
 *
 * Subscribes user to fire notifications
 */
export async function subscribeToFireNotifications(
  data: NotificationSubscriptionRequest
): Promise<NotificationSubscriptionResponse> {

  const url = `${API_BASE}/api/notifications/subscribe`;

  return fetchJSON(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(data),
  });
}


/**
 * POST /api/twilio/send-fire-alert
 *
 * Usually called by backend or admin panel,
 * not normal users
 */
export async function sendFireAlert(
  data: FireAlertRequest
): Promise<FireAlertResponse> {

  const url = `${API_BASE}/api/notifications/send-fire-alert`;

  return fetchJSON(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(data),
  });
}