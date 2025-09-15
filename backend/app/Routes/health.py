from flask import Blueprint, jsonify
from sqlalchemy import text
from ..extensions import db

bp = Blueprint("health", __name__, url_prefix="/api")

@bp.get("/ping")
def ping():
    return jsonify({"message": "pong"})

@bp.get("/db-health")
def db_health():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
