import { useEffect, useState } from "react";
import { styles } from "./NotificationPage.styles";

type DemoAlert = {
  id: number;
  title: string;
  location: string;
  date: string;
  riskLevel: string;
  conditions: string;
};

export default function Notifications() {
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [demoAlert, setDemoAlert] = useState<DemoAlert | null>(null);

  async function handleSubscribe() {
    if (!optIn) {
      alert("You must agree to receive notifications before subscribing.");
      return;
    }

    // Keeping backend/demo subscription behavior untouched
    alert("Subscribed to fire alerts!");
  }

  function triggerDemoAlert() {
    const now = new Date();
    const formattedDate = now.toLocaleString();

    const location = `ZIP ${zip || "78701"}`;
    const riskProbability = `${Math.floor(Math.random() * 50) + 50}%`;
    const weatherConditions = ["Hot & Dry", "Windy", "Low Humidity", "High Heat"][
      Math.floor(Math.random() * 4)
    ];

    setDemoAlert({
      id: Date.now(),
      title: "🔥 Fire Risk Alert",
      location,
      date: formattedDate,
      riskLevel: riskProbability,
      conditions: weatherConditions,
    });
  }

  function dismissDemoAlert() {
    setDemoAlert(null);
  }

  useEffect(() => {
    if (!demoAlert) return;

    const timer = setTimeout(() => {
      setDemoAlert(null);
    }, 7000);

    return () => clearTimeout(timer);
  }, [demoAlert]);

  return (
    <div style={styles.container}>
      {demoAlert && (
        <div style={styles.toastWrapper}>
          <div style={styles.toastCard}>
            <div style={styles.toastHeader}>
              <span style={styles.toastTitle}>{demoAlert.title}</span>
              <button
                style={styles.toastCloseButton}
                onClick={dismissDemoAlert}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>

            <div style={styles.toastBody}>
              <p style={styles.toastText}>
                <strong>Location:</strong> {demoAlert.location}
              </p>
              <p style={styles.toastText}>
                <strong>Date:</strong> {demoAlert.date}
              </p>
              <p style={styles.toastText}>
                <strong>Risk Level:</strong> {demoAlert.riskLevel}
              </p>
              <p style={styles.toastText}>
                <strong>Conditions:</strong> {demoAlert.conditions}
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h1 style={styles.title}>Fire Alerts</h1>

        <input
          style={styles.input}
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
        />

        <label
          style={{
            fontSize: "14px",
            display: "flex",
            alignItems: "flex-start",
            marginTop: "10px",
            lineHeight: 1.4,
          }}
        >
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            style={{ marginRight: "8px", marginTop: "3px" }}
          />
          I agree to receive fire alert notifications via SMS and website alerts.
          Message & data rates may apply.
        </label>

        <button style={styles.button} onClick={handleSubscribe}>
          Subscribe
        </button>

        <button style={styles.button} onClick={triggerDemoAlert}>
          Trigger Demo Alert
        </button>
      </div>
    </div>
  );
}