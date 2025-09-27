import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from .extensions import db, migrate
from .Routes import register_routes  # Capital R
from .Models import RawDetection
from .Models import Message

def create_app():
    load_dotenv()
    app = Flask(__name__)
    CORS(app)

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


    # >>> AUTO-CREATE TABLES (no migrations) <<<
    with app.app_context():
        db.create_all()

    register_routes(app)
    return app

app = create_app()
