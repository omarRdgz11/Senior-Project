# backend/app/model/bundle.py
import os, joblib

_BUNDLE = None

def load_bundle():
    """
    Returns a dict with keys:
      - model (sklearn estimator)
      - complete_features (list[str])
      - feature_means (dict[str, float])
      - threshold (float)
    """
    global _BUNDLE
    if _BUNDLE is None:
        here = os.path.dirname(__file__)
        pkl_path = os.path.join(here, "fire_prediction_model.pkl")
        obj = joblib.load(pkl_path)
        # If your .pkl is only the estimator, raise a clear error:
        required = {"model", "complete_features", "feature_means", "threshold"}
        if not isinstance(obj, dict) or not required.issubset(set(obj.keys())):
            raise RuntimeError(
                "Loaded pickle does not contain the expected bundle keys. "
                "Expected keys: model, complete_features, feature_means, threshold."
            )
        _BUNDLE = obj
    return _BUNDLE
