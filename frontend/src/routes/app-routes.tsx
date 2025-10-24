import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";

// NOTE: match folder casing exactly (Linux/Docker are case-sensitive)
import HomePage from "../pages/Home/HomePage";
import AboutPage from "../pages/About/AboutPage";
import Omar from "../pages/About/People/Omar";
import Linh from "../pages/About/People/Linh";
import Analee from "../pages/About/People/Analee"
import WildfireMapPage from "../pages/WildfireMap/WildfireMapPage";
import TestRawDetections from "../pages/TestRawDetections";
import ModelTest from "../pages/ModelTest";
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
      { path: "WildfireMap", element: <WildfireMapPage /> },         // /WildfireMap
      { path: "about", element: <AboutPage /> },         // "/about"
      { path: "TestRawDetections", element: <TestRawDetections />},

      // People profiles (one route per file under About/People)
      { path: "about/people/omar", element: <Omar /> },
      { path: "about/people/linh", element: <Linh /> },
      { path: "about/people/Analee", element: <Analee />},
      { path: "ModelTest", element: <ModelTest />},

      { path: "*", element: <NotFound /> },
    ],
  },
]);

