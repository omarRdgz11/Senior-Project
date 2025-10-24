# app/model/service.py
import os
import joblib
import numpy as np
import pandas as pd

_MODEL_ARTIFACT = None
_ESTIMATOR = None
_FEATURE_COLUMNS = None
# env overrides saved threshold; else default to artifact['threshold'] if present; else 0.25
_ENV_THRESHOLD = os.getenv("FIRE_RISK_THRESHOLD")

def _load_artifact_once():
    global _MODEL_ARTIFACT, _ESTIMATOR, _FEATURE_COLUMNS
    if _MODEL_ARTIFACT is None:
        from pathlib import Path
        path = Path(__file__).with_name("fire_prediction_model.pkl")
        _MODEL_ARTIFACT = joblib.load(path)

        if isinstance(_MODEL_ARTIFACT, dict) and "model" in _MODEL_ARTIFACT:
            _ESTIMATOR = _MODEL_ARTIFACT["model"]
            # Prefer explicit complete_features; else infer from feature_means keys
            if "complete_features" in _MODEL_ARTIFACT and _MODEL_ARTIFACT["complete_features"]:
                _FEATURE_COLUMNS = list(_MODEL_ARTIFACT["complete_features"])
            elif "feature_means" in _MODEL_ARTIFACT and isinstance(_MODEL_ARTIFACT["feature_means"], dict):
                _FEATURE_COLUMNS = list(_MODEL_ARTIFACT["feature_means"].keys())
            else:
                _FEATURE_COLUMNS = None
        else:
            # fallback: artifact is a bare estimator (unlikely in your case)
            _ESTIMATOR = _MODEL_ARTIFACT
            _FEATURE_COLUMNS = None
    return _MODEL_ARTIFACT

def get_estimator():
    _load_artifact_once()
    return _ESTIMATOR

def get_feature_columns():
    _load_artifact_once()
    return _FEATURE_COLUMNS

def get_threshold_default() -> float:
    _load_artifact_once()
    if _ENV_THRESHOLD is not None:
        return float(_ENV_THRESHOLD)
    # artifact-provided threshold fallback
    if isinstance(_MODEL_ARTIFACT, dict) and "threshold" in _MODEL_ARTIFACT:
        try:
            return float(_MODEL_ARTIFACT["threshold"])
        except Exception:
            pass
    return 0.25

def predict_proba(feature_rows: pd.DataFrame) -> np.ndarray:
    est = get_estimator()
    # RandomForestClassifier has predict_proba
    if hasattr(est, "predict_proba"):
        proba = est.predict_proba(feature_rows)
        return proba[:, 1] if proba.ndim == 2 and proba.shape[1] >= 2 else proba.reshape(-1)

    # Fallbacks (unlikely for RF)
    if hasattr(est, "decision_function"):
        scores = est.decision_function(feature_rows)
        return 1 / (1 + np.exp(-scores))
    if hasattr(est, "predict"):
        return est.predict(feature_rows).astype(float)
    raise AttributeError("Loaded estimator has neither predict_proba, decision_function, nor predict.")

def score_to_label(prob: float, threshold: float | None) -> bool:
    t = get_threshold_default() if threshold is None else float(threshold)
    return float(prob) >= t
