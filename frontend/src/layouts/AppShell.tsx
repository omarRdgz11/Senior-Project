import { NavLink, Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="navbar sticky top-0 z-40 border-b border-base-200 bg-base-100/80 backdrop-blur">
        <div className="container mx-auto flex items-center gap-2 px-4">
          <NavLink to="/" className="font-semibold mr-2">Fire Detection System</NavLink>
          <div className="ml-auto flex items-center gap-1">
            <NavLink to="/" className="btn btn-ghost normal-case text-sm font-medium">Home</NavLink>
            <NavLink to="/about" className="btn btn-ghost normal-case text-sm font-medium">About</NavLink>
          </div>
        </div>
      </header>

      {/* IMPORTANT: this renders the current page */}
      <main className="container mx-auto max-w-5xl p-6">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-base-200">
        <div className="container mx-auto p-6 text-sm text-base-content/70">
          © {new Date().getFullYear()} Fire Detection
        </div>
      </footer>
    </div>
  );
}
