import { useState } from "react";
import { styles } from "./NotificationPage.styles";

export default function Notifications() {
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [optIn, setOptIn] = useState(false);

  async function requestPermission() {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  async function handleSubscribe() {
    if (!optIn) {
      alert("You must agree to receive notifications before subscribing.");
      return;
    }

    const granted = await requestPermission();

    if (!granted) {
      alert("Notification permission denied.");
      return;
    }

    alert("Subscribed to fire alerts!");
  }

  async function triggerDemoAlert() {
    console.log("Trigger clicked");
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }

    let permission = Notification.permission;

    // Ask for permission if not already granted
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      alert("Notifications are blocked. Please allow them.");
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleString();

    const location = `ZIP ${zip || "78701"}`;
    const riskProbability = `${Math.floor(Math.random() * 50) + 50}%`;
    const weatherConditions = ["Hot & Dry", "Windy", "Low Humidity", "High Heat"][
      Math.floor(Math.random() * 4)
    ];

    new Notification("🔥 Fire Risk Alert", {
      body: `Location: ${location}
Date: ${formattedDate}
Risk Level: ${riskProbability}
Conditions: ${weatherConditions}`,
    });
  }

  return (
    <div style={styles.container}>
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

        <label style={{ fontSize: "14px", display: "flex", alignItems: "center", marginTop: "10px" }}>
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          I agree to receive fire alert notifications via SMS and browser alerts. Message & data rates may apply.
        </label>

        <button style={styles.button} onClick={handleSubscribe}>
          Subscribe
        </button>

        {/* NEW DEMO BUTTON */}
        <button
          style={{ ...styles.button}}
          onClick={triggerDemoAlert}
        >
          Trigger Demo Alert
        </button>
      </div>
    </div>
  );
}