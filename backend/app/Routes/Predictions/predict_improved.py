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
    GET /api/improved/daily?date=YYYY-MM-DD&region=<slug>

    Query params:
        - date (required): YYYY-MM-DD
        - region (optional): Region slug (austin, dallas, houston, san_antonio).
                            Defaults to 'austin' for backward compatibility.
    """
    date_str = request.args.get("date")
    region_slug = request.args.get("region", "austin")  # Default to austin

    if not date_str:
        return jsonify({"error": "date query param is required (YYYY-MM-DD)"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "invalid date format, expected YYYY-MM-DD"}), 400

    # Pass region to prediction service
    result = predict_daily_fire_risk(target_date, region_slug)
    return jsonify(result)
