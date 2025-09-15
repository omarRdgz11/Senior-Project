from flask import Blueprint, jsonify, request
from sqlalchemy import desc
from ..extensions import db
from ..Models import Message

bp = Blueprint("hello", __name__, url_prefix="/api/hello")

@bp.get("")
def list_messages():
    limit = min(max(request.args.get("limit", 10, type=int), 1), 100)
    rows = (
        Message.query
        .order_by(desc(Message.created_at))
        .limit(limit)
        .all()
    )
    return jsonify({"count": len(rows), "rows": [m.to_dict() for m in rows]})

@bp.post("")
def create_message():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 280:
        return jsonify({"error": "text too long (max 280)"}), 400

    m = Message(text=text)
    db.session.add(m)
    db.session.commit()
    return jsonify(m.to_dict()), 201
