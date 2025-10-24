# app/Routes/predict.py
from flask import Blueprint, request, jsonify
import pandas as pd

from ..model.service import predict_proba, score_to_label, get_feature_columns

bp_predict = Blueprint("predict", __name__, url_prefix="/api/predict")

@bp_predict.route("/features", methods=["GET"])
def features():
    return jsonify({
        "feature_names": get_feature_columns() or [],
        "default_threshold": get_threshold_default()
    }), 200

@bp_predict.route("", methods=["POST"])
def predict():
    data = request.get_json(force=True, silent=False)
    rows = data.get("rows", [])
    if not isinstance(rows, list) or len(rows) == 0:
        return jsonify(error="Provide a non-empty 'rows' array"), 400

    df = pd.DataFrame(rows)
    feat_cols = get_feature_columns()
    if not feat_cols:
        return jsonify(error="Model artifact did not provide feature list. Add 'complete_features' or define route feature_columns."), 500

    # Check required features exist in payload
    missing = [c for c in feat_cols if c not in df.columns]
    if missing:
        return jsonify(error=f"Missing features required by model: {missing}"), 400

    # Subset and coerce numerics
    X = df[feat_cols].copy()
    for c in X.columns:
        if X[c].dtype == object:
            X[c] = pd.to_numeric(X[c], errors="coerce")

    if X.isna().any().any():
        # help caller fix inputs; show first few offenders
        bad = {c: X[c][X[c].isna()].index.tolist()[:5] for c in X.columns if X[c].isna().any()}
        return jsonify(error="NaNs after numeric coercion; check inputs", details=bad), 400

    if X.shape[1] == 0:
        return jsonify(error="No usable feature columns after subsetting; check feature names"), 400

    probs = predict_proba(X)
    th = data.get("threshold", None)

    results = [{"index": i, "probability": float(p), "fire_risk": bool(score_to_label(p, th))}
               for i, p in enumerate(probs)]
    return jsonify(results=results), 200
