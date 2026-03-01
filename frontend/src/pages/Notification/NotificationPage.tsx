import { useState } from "react";
import { styles } from "./NotificationPage.styles";
import { subscribeToFireNotifications } from "../../api/notifications";

export default function Notifications() {

  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");

  async function handleSubscribe() {

    await subscribeToFireNotifications({

        phone_number: phone,

        zip_code: zip,

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

        <button style={styles.button} onClick={handleSubscribe}>
          Subscribe
        </button>

      </div>

    </div>
  );
}