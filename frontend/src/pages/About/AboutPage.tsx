import { Link } from "react-router-dom";

const people = [
  { name: "Analee", role: "Developer", path: "/about/people/analee"},
  { name: "Linh", role: "Developer", path: "/about/people/linh" },
  { name: "Omar", role: "Developer", path: "/about/people/omar" },
  
  // Add more { name, role, path } as new files are created
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      {/* Project blurb */}
      <div className="card bg-base-100 border border-base-200 shadow">
        <div className="card-body space-y-3">
          <h1 className="card-title">About</h1>
          <p className="text-base-content/70">
            This project is a simple front-end for a fire detection system built around NASA FIRMS data.
            The goal is to explore recent hotspots, visualize them on a map, and provide lightweight tools
            for filtering by time and region. The current focus is getting our dev stack and pages in place.
          </p>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary btn-sm" href="http://localhost:5173" target="_blank" rel="noreferrer">
              Frontend
            </a>
            <a className="btn btn-primary btn-sm" href="http://localhost:5005/api/ping" target="_blank" rel="noreferrer">
              Backend (API: Ping)
            </a>
            <a className="btn btn-primary btn-sm" href="http://localhost:8080" target="_blank" rel="noreferrer">
              Adminer
            </a>
          </div>
        </div>
      </div>

      {/* People list */}
      <div className="card bg-base-100 border border-base-200 shadow">
        <div className="card-body">
          <h2 className="card-title">Team</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <div key={p.path} className="card bg-base-100 border border-base-200">
                <div className="card-body">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-base-content/70">{p.role}</div>
                  <Link to={p.path} className="btn btn-sm btn-outline w-max mt-2">
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-base-content/60 mt-3">
            Add new profiles by creating a file under <code>src/pages/About/People/</code> and
            adding a route in <code>app-routes.tsx</code>.
          </p>
        </div>
      </div>
    </div>
  );
}



