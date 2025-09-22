# Senior Project Directory Structure
senior-project/
├─ .env                        # DB creds + DATABASE_URL (db host), VITE_API_BASE
├─ .gitignore
├─ .dockerignore
├─ docker-compose.yml          # db, adminer, backend (5005), frontend (5173)
├─ README.md                   # (optional) quickstart / team notes
│
├─ backend/
│  ├─ Dockerfile               # Flask dev server on 0.0.0.0:5005
│  ├─ requirements.txt         # Flask, SQLAlchemy, psycopg, etc.
│  │
│  └─ app/
│     ├─ __init__.py           # create_app(); loads env; db.init_app; db.create_all(); register_routes
│     ├─ extensions.py         # db = SQLAlchemy(); migrate = Migrate()
│     │
│     ├─ Models/               # NOTE: capital M (case-sensitive in Linux)
│     │  ├─ __init__.py        # from .message import Message
│     │  └─ message.py         # Message model (id, text, created_at)
│     │
│     └─ Routes/               # NOTE: capital R (case-sensitive in Linux)
│        ├─ __init__.py        # register_routes(app) -> health_bp, hello_bp
│        ├─ health.py          # GET /api/ping, GET /api/db-health
│        └─ hello.py           # GET/POST /api/hello
│
└─ frontend/
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
               └─ Teammate.tsx            # `@import "tailwindcss";`
