// src/pages/Home/HomePage.tsx
import { styles } from "./HomePage.styles";
import { Link } from "react-router-dom";

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
            <Link
              className="btn btn-primary btn-lg"
              to="/wildfiremap"
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
            </Link>

            
            <Link
            //add link on homepage for evacuation routes page
            className="btn btn-primary btn-lg"
            to="/evacuation"  
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
            Evacuation
            </Link>

            <Link
              className="btn btn-primary btn-lg"
              to="/about"
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
              About
            </Link>
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
