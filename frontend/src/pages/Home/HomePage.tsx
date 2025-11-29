// src/pages/Home/LandingPage.tsx
import { styles } from "./HomePage.styles";

export default function LandingPage() {
  return (
    <div style={styles.container}>
      <div style={styles.contentWrapper}>
        {/* Left side — Card */}
        <div style={styles.card}>
          <h1 style={styles.title}>Every Second Counts</h1>
          <p style={styles.subtitle}>
            Track wildfire movement live, receive safety alerts, and make faster, safer decisions when it matters most
          </p>

          <div className="flex flex-wrap gap-2" style={styles.buttons}>
            <a
              className="btn btn-primary btn-lg"
              href="/WildfireMap"
              style={styles.mapBtn}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  styles.btnHover.backgroundColor!)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  styles.mapBtn.backgroundColor!)
              }
            >
              View Map
            </a>

            <a
              className="btn btn-primary btn-lg"
              href="/about"
              style={styles.aboutBtn}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  styles.btnHover.backgroundColor!)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  styles.aboutBtn.backgroundColor!)
              }
            >
              About
            </a>
          </div>
        </div>

        {/* Right side — Background Image */}
        <div style={styles.imageContainer}>
          <img
            src="/images/background-fire.png"
            alt="Wildfire Background"
            style={styles.sideImage}
          />
        </div>
      </div>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} WildSight. All rights reserved.
      </footer>
    </div>
  );
}
