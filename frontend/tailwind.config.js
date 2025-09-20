// ESM config is correct because package.json has "type": "module"
import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  // This is fine even on Tailwind v4 (Vite plugin will pick it up)
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: { extend: {} },
  plugins: [daisyui],
  daisyui: {
    themes: ["retro", "business", "dark", "forest", "corporate"],
  },
};
