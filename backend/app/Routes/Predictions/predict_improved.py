# backend/app/Routes/Predictions/predict_improved.py

from datetime import datetime
from flask import Blueprint, request, jsonify

from app.services.improved_prediction import predict_daily_fire_risk

bp_predict_improved = Blueprint(
    "predict_improved",
    __name__,
    url_prefix="/api/improved",
)


@bp_predict_improved.route("/daily", methods=["GET"])
def predict_daily():
    """
    GET /api/improved/daily?date=YYYY-MM-DD
    """
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"error": "date query param is required (YYYY-MM-DD)"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "invalid date format, expected YYYY-MM-DD"}), 400

    result = predict_daily_fire_risk(target_date)
    return jsonify(result)
