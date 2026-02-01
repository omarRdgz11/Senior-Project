import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from .extensions import db, migrate
from .Routes import register_routes  # Capital R

def create_app():
    load_dotenv()
    app = Flask(__name__)

    # Allow dev (localhost) and production (windssight.com) origins
    cors_origins = [
        "http://localhost:5173",      # Local dev
        "https://windssight.com",     # Production
        "https://www.windssight.com", # Production www
    ]
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        base = os.path.abspath(os.path.dirname(__file__))
        db_url = f"sqlite:///{os.path.join(base, '..', 'app.db')}"
    app.config.update(
        SQLALCHEMY_DATABASE_URI=db_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False
    )

    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so SQLAlchemy sees them
    from .Models import Message  # noqa: F401

    # AUTO-CREATE TABLES (development only - use migrations in production)
    # In production, run: flask db upgrade
    if os.getenv("FLASK_ENV") != "production":
        with app.app_context():
            db.create_all()

    register_routes(app)
    return app

app = create_app()
