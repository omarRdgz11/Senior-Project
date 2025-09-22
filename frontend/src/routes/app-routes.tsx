import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";

// NOTE: match folder casing exactly (Linux/Docker are case-sensitive)
import HomePage from "../pages/Home/HomePage";
import AboutPage from "../pages/About/AboutPage";
import Omar from "../pages/About/People/Omar";

// Add more imports as new teammates create files

const NotFound = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">404</h1>
    <p className="text-base-content/70">Page not found.</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },            // "/"
      { path: "about", element: <AboutPage /> },         // "/about"

      // People profiles (one route per file under About/People)
      { path: "about/people/omar", element: <Omar /> },


      { path: "*", element: <NotFound /> },
    ],
  },
]);

