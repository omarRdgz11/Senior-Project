# ml_predict.py

from catboost import CatBoostClassifier
import joblib
import json
import os
import pandas as pd


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "model_config.json")

with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

# Champion: CatBoost
cat_cfg = CONFIG["catboost"]
CAT_FEATURES = cat_cfg["features"]
CAT_THRESHOLD = float(cat_cfg["threshold"])

cat_model = CatBoostClassifier()
cat_model.load_model(os.path.join(BASE_DIR, cat_cfg["model_path"]))

# Shadow: Random Forest
rf_cfg = CONFIG["random_forest_shadow"]
RF_FEATURES = rf_cfg["features"]
RF_THRESHOLD = float(rf_cfg["threshold"])

rf_model = joblib.load(os.path.join(BASE_DIR, rf_cfg["model_path"]))


def predict_fire_risk(feature_row: dict) -> dict:
    """
    Takes a SINGLE engineered feature row (dict) and returns:

        - champion model (CatBoost) prob + label
        - shadow model (Random Forest) prob + label

    feature_row must contain at least all keys in CAT_FEATURES and RF_FEATURES.
    """

    # Build 1-row DataFrames in the EXACT feature order expected by each model
    X_cat = pd.DataFrame([[feature_row[f] for f in CAT_FEATURES]],
                         columns=CAT_FEATURES)

    X_rf = pd.DataFrame([[feature_row[f] for f in RF_FEATURES]],
                        columns=RF_FEATURES)

    # Champion model: CatBoost
    cat_prob = float(cat_model.predict_proba(X_cat)[:, 1][0])
    cat_label = int(cat_prob >= CAT_THRESHOLD)

    # Shadow model: Random Forest
    rf_prob = float(rf_model.predict_proba(X_rf)[:, 1][0])
    rf_label = int(rf_prob >= RF_THRESHOLD)

    return {
        "champion": {
            "model": "CatBoost",
            "prob": cat_prob,
            "label": cat_label,
            "threshold": CAT_THRESHOLD,
        },
        "shadow": {
            "model": "RandomForest",
            "prob": rf_prob,
            "label": rf_label,
            "threshold": RF_THRESHOLD,
        },
    }
