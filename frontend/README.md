# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# Frontend (React + Vite + Tailwind v4 + daisyUI)

Single-page app for the Fire (FIRMS) Detection project.  
Runs on Vite (port 5173) and talks to the backend via `/api` (proxied to Flask on 5005).

---

## Tech stack

- React 19 + React Router
- Vite 7
- Tailwind CSS v4
- daisyUI (Tailwind component library & themes)
- Dev proxy to backend at `/api` (configured in `vite.config.ts`)
- Works in Docker or locally (Node 18+ recommended; Node 20+ ideal)

---

## Directory structure

frontend/
├─ README.md
├─ package.json
├─ vite.config.ts                # Vite + @tailwindcss/vite + React; /api proxy
├─ index.html                    # sets default daisyUI theme via data-theme
├─ tailwind.config.js            # Tailwind (ESM) + optional daisyUI plugin
└─ src/
   ├─ index.css                  # Tailwind v4 + @plugin "daisyui"; minimal globals
   ├─ main.tsx                   # React bootstrap; RouterProvider
   ├─ vite-env.d.ts
   │
   ├─ routes/
   │  └─ app-routes.tsx          # createBrowserRouter + nested routes
   │
   ├─ layouts/
   │  └─ AppShell.tsx            # navbar + <Outlet/> + footer; daisyUI tokens
   │
   ├─ components/
   │  └─ Page.tsx                # simple page wrapper (optional)
   │
   └─ pages/
      ├─ Home/
      │  └─ HomePage.tsx
      └─ About/
         ├─ AboutPage.tsx
         └─ People/
            ├─ Omar.tsx
            └─ Teammate.tsx
            └─ Teammate.tsx
