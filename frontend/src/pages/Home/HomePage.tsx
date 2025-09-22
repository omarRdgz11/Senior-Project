import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="card bg-base-100 border border-base-200 shadow">
      <div className="card-body space-y-3">
        <h1 className="card-title">Home</h1>
        <p className="text-base-content/70">Welcome to the Fire Detection app.</p>

        <div className="flex flex-wrap gap-2">
          <Link to="/about" className="btn btn-primary">About</Link>
          {/* sample personal page route */}
          <Link to="/about/me/your-name" className="btn btn-outline">About Me</Link>
        </div>
      </div>
    </div>
  );
}
