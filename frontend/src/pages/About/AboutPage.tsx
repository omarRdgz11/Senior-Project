import { Link } from "react-router-dom";
import { styles } from "./AboutPage.styles"

const people = [
  { name: "Analee", role: "Developer", path: "/about/people/analee"},
  { name: "Linh", role: "Developer", path: "/about/people/linh", imgPath: "/images/about-me/profile-pictures/linhProfilePicture.JPG" },
  { name: "Omar", role: "Developer", path: "/about/people/omar", imgPath: "/images/about-me/profile-pictures/omarProfilePicture.jpg" },
  
  // Add more { name, role, path } as new files are created
];

export default function AboutPage() {
  return (
    <div className="space-y-6" style={styles.container}>
      {/* Project blurb */}
      <div className="card bg-base-100" style={styles.card}>
        <div className="card-body space-y-3">
          <h1 className="card-title" style={styles.title}>About</h1>
          <p className="text-base-content/70" style={styles.text}>
            WildSight is a web application designed to help communities in Austin’s wildland-urban interface (WUI) stay informed and prepared for wildfire risks. 
            Using real-time satellite data, weather information, and interactive mapping tools, the platform tracks active fires, predicts potential danger zones, and delivers timely alerts to residents and emergency responders.
          </p>
          <p className="text-base-content/70" style={styles.text}>
            As urban development expands into fire-prone areas and Texas faces hotter, drier conditions, early detection and situational awareness are critical. 
            WildSight empowers users to visualize fire activity, assess local risk levels, and make informed decisions to protect lives, property, and natural habitats.
            Our goal is to bridge technology and public safety—making wildfire data accessible, actionable, and community-driven.
          </p>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary btn-sm" style={styles.abtBtn} href="http://localhost:5173" target="_blank" rel="noreferrer">
              Frontend
            </a>
            <a className="btn btn-primary btn-sm" style={styles.abtBtn} href="http://localhost:5005/api/ping" target="_blank" rel="noreferrer">
              Backend (API: Ping)
            </a>
            <a className="btn btn-primary btn-sm" style={styles.abtBtn} href="http://localhost:8080" target="_blank" rel="noreferrer">
              Adminer
            </a>
          </div>
        </div>
      </div>

      {/* People list */}
      <div className="card w-full bg-base-100 border border-base-200 shadow" style={styles.card}>
        <div className="card-body">
          <h2 className="card-title" style={styles.title}>Team</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <div key={p.path} className="card bg-base-100 border border-base-200" style={styles.teamCard}>
                <div className="card-body">
                  <img
                    src={p.imgPath} /* <- replace with your path */
                    alt="Portrait"
                    className="w-32 h-32 rounded-full shadow-md object-cover"
                    style={styles.profileImg}
                  />                  
                  <div className="font-semibold" style={styles.subtitle}>{p.name}</div>
                  <div className="text-base-content/70" style={styles.text}>{p.role}</div>
                  <Link to={p.path} className="btn btn-sm w-24" style={styles.teamBtn}>
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



