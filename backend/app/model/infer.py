# app/model/infer.py
from __future__ import annotations
import pandas as pd
from .bundle import load_bundle
from .service import predict_proba, score_to_label, get_threshold_default

def predict_from_features(feats: dict, threshold: float | None = None) -> dict:
    """
    Accepts a dict of engineered features {name: value}.
    Returns: {"probability": float, "label": bool, "threshold": float}
    """
    bundle = load_bundle()
    cols = bundle["complete_features"]          # strict column order
    means = bundle.get("feature_means", {})     # default fill values

    # Build a single-row DataFrame in the right order, filling missing with means (or 0.0)
    row = [feats.get(c, means.get(c, 0.0)) for c in cols]
    X = pd.DataFrame([row], columns=cols)

    prob = float(predict_proba(X)[0])
    thr = get_threshold_default() if threshold is None else float(threshold)
    return {
        "probability": prob,
        "label": score_to_label(prob, thr),
        "threshold": thr,
    }
