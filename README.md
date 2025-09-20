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
   ├─ index.html
   ├─ package.json
   ├─ vite.config.ts           # proxy '/api' → backend:5005 (container) or localhost:5005
   │
   └─ src/
      ├─ main.tsx
      ├─ App.tsx               # simple UI to hit ping / db-health / hello
      └─ index.css             # `@import "tailwindcss";`
