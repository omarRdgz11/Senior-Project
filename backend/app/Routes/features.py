# backend/app/Routes/features.py
from flask import Blueprint, request, jsonify
from app.services.features import derive_features_level2

bp_features = Blueprint("features", __name__, url_prefix="/api/features")

@bp_features.route("/derive", methods=["GET"])
def derive():
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
        date = request.args.get("date")  # "YYYY-MM-DD"
        if not date:
            return jsonify(error="date is required (YYYY-MM-DD)"), 400
        radius_km = float(request.args.get("radius_km", "25"))
        feats_dict, ordered = derive_features_level2(lat, lon, date, radius_km)
        return jsonify(
            features=feats_dict,
            complete=True if all(v is not None for v in ordered) else False,
            filled_with_means=[k for k, v in feats_dict.items() if v is None],  # optional
        )
    except KeyError as e:
        return jsonify(error=f"missing param: {e}"), 400
    except Exception as e:
        return jsonify(error=str(e)), 500
