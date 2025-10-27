# app/Routes/predict.py
from datetime import date
from flask import Blueprint, request, jsonify
import pandas as pd

from ..model.service import predict_proba, score_to_label, get_feature_columns
from ..model.bundle import load_bundle                    # {model, complete_features, feature_means, threshold}
from ..services.features import derive_features_level2    # returns (feats_dict, ordered_values)

bp_predict = Blueprint("predict", __name__, url_prefix="/api/predict")

def _to_date(s: str) -> date:
    return date.fromisoformat(s)

def _predict_from_features_dict(
    feats_dict: dict,
    threshold_override: float | None = None,
) -> dict:
    """
    Small helper: aligns feats_dict -> model feature order, runs predict_proba,
    and returns {probability, threshold, risk}.
    """
    bundle = load_bundle()
    feat_cols = get_feature_columns() or bundle.get("complete_features", [])
    if not feat_cols:
        raise RuntimeError("Model artifact missing feature list (complete_features).")

    # Fill any missing features with model means to be safe
    means = bundle.get("feature_means", {})
    row = [feats_dict.get(c, means.get(c, 0.0)) for c in feat_cols]
    X = pd.DataFrame([row], columns=feat_cols)

    # Coerce numerics
    for c in X.columns:
        if X[c].dtype == object:
            X[c] = pd.to_numeric(X[c], errors="coerce")
    if X.isna().any().any():
        raise ValueError("NaNs produced after numeric coercion in aligned features.")

    prob = float(predict_proba(X)[0])
    th = float(threshold_override if threshold_override is not None else bundle.get("threshold", 0.25))
    return {
        "probability": prob,
        "threshold": th,
        "risk": bool(prob >= th),
    }

@bp_predict.route("/point", methods=["GET"])
def predict_point_get():
    """
    GET /api/predict/point?lat=30.3&lon=-97.75&date=2023-08-15&radius_km=25&threshold=0.25
    """
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
        iso = request.args["date"]
    except KeyError:
        return jsonify({"error": "lat,lon,date are required"}), 400

    radius = float(request.args.get("radius_km", "25"))
    th = request.args.get("threshold")
    th = float(th) if th is not None else None

    feats_dict, _ordered = derive_features_level2(lat, lon, iso, radius_km=radius)
    pred = _predict_from_features_dict(feats_dict, threshold_override=th)

    return jsonify({
        "where": {"lat": lat, "lon": lon, "radius_km": radius},
        "when": {"date": iso},
        "probability": pred["probability"],
        "risk": pred["risk"],
        "threshold_used": pred["threshold"],
        "features_used": feats_dict,   # optional for debugging
        "mode": "level2-autofill",
    }), 200

@bp_predict.route("/features", methods=["GET"])
def features():
    bundle = load_bundle()
    return jsonify({
        "feature_names": get_feature_columns() or bundle.get("complete_features", []),
        "default_threshold": bundle.get("threshold", 0.25),
    }), 200

@bp_predict.route("", methods=["POST"])
def predict():
    """
    Modes:
      A) Raw features: { "rows": [ {<29 features>}, ... ], "threshold": 0.25 }
      B) Level-2 point/date: { "where": {...}, "when": {"date": ...}, "autofill_missing": true, "threshold": 0.25 }
         (C is reserved for Level-3; currently routes to Level-2 builder)
    """
    data = request.get_json(force=True, silent=False)

    bundle = load_bundle()
    feat_cols = get_feature_columns() or bundle.get("complete_features", [])
    if not feat_cols:
        return jsonify(error="Model artifact missing 'complete_features' and get_feature_columns()."), 500

    th_override = data.get("threshold", None)
    threshold_used = float(th_override if th_override is not None else bundle.get("threshold", 0.25))

    # -------- Mode A: raw features --------
    if "rows" in data:
        rows = data.get("rows", [])
        if not isinstance(rows, list) or len(rows) == 0:
            return jsonify(error="Provide a non-empty 'rows' array"), 400

        df = pd.DataFrame(rows)

        missing = [c for c in feat_cols if c not in df.columns]
        if missing:
            return jsonify(error=f"Missing features required by model: {missing}"), 400

        X = df[feat_cols].copy()
        for c in X.columns:
            if X[c].dtype == object:
                X[c] = pd.to_numeric(X[c], errors="coerce")
        if X.isna().any().any():
            bad = {c: X[c][X[c].isna()].index.tolist()[:5] for c in X.columns if X[c].isna().any()}
            return jsonify(error="NaNs after numeric coercion; check inputs", details=bad), 400

        probs = predict_proba(X)
        results = [{
            "index": i,
            "probability": float(p),
            "fire_risk": bool(score_to_label(p, threshold_used)),
            "threshold_used": threshold_used,
            "mode": "raw-features",
        } for i, p in enumerate(probs)]
        return jsonify(results=results), 200

    # -------- Mode B/C: point/date --------
    if "where" in data and "when" in data:
        try:
            lat = float(data["where"]["lat"])
            lon = float(data["where"]["lon"])
            radius_km = float(data["where"].get("radius_km", 25))
            date_iso = data["when"]["date"]  # "YYYY-MM-DD"
        except (KeyError, ValueError) as e:
            return jsonify(error=f"Invalid or missing 'where/when' fields: {e}"), 400

        _autofill = data.get("autofill_missing", True)  # reserved for future Level-3 switch
        feats_dict, _ordered = derive_features_level2(lat, lon, date_iso, radius_km)

        pred = _predict_from_features_dict(feats_dict, threshold_override=th_override)
        results = [{
            "index": 0,
            "probability": float(pred["probability"]),
            "fire_risk": bool(pred["risk"]),
            "threshold_used": float(pred["threshold"]),
            "mode": "level2-autofill",
        }]
        return jsonify(results=results), 200

    return jsonify(error="Provide either 'rows' OR 'where' + 'when'"), 400
