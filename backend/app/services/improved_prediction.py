# backend/app/services/improved_prediction.py
from datetime import date as Date
import pandas as pd
from app.improved_model import (
    engineer_features,
    get_latest_features_for_prediction,
    predict_fire_risk,
)
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from app.Models.Fire.travis_fires_daily import TravisFiresDaily
from app.extensions import db
def build_daily_history(target_date: Date) -> pd.DataFrame:
    """
    Query your DB for all daily rows up to target_date for the region of interest
    and return a DataFrame with the RAW columns expected by engineer_features().
    """
    # 1) Fire data – already daily with fire_count
    fires = (
        db.session.query(
            TravisFiresDaily.acq_date,          # already named acq_date
            TravisFiresDaily.fire_count,        # use stored fire_count
        )
        .filter(TravisFiresDaily.acq_date <= target_date)
        .order_by(TravisFiresDaily.acq_date)
        .all()
    )
    fires_df = pd.DataFrame(fires, columns=["acq_date", "fire_count"])
    # 2) Daily weather – use datetime, but label it as acq_date
    weather = (
        db.session.query(
            OpenMeteoWeather.datetime.label("acq_date"),
            OpenMeteoWeather.tempmax,
            OpenMeteoWeather.tempmin,
            OpenMeteoWeather.humidity,
            OpenMeteoWeather.windspeed,
            OpenMeteoWeather.precip,
        )
        .filter(OpenMeteoWeather.datetime <= target_date)
        .order_by(OpenMeteoWeather.datetime)
        .all()
    )
    weather_df = pd.DataFrame(
        weather,
        columns=[
            "acq_date",
            "tempmax",
            "tempmin",
            "humidity",
            "windspeed",
            "precip",
        ],
    )
    # 3) Outer-merge on acq_date; fill missing fire_count with 0
    history_df = (
        pd.merge(weather_df, fires_df, on="acq_date", how="left")
        .sort_values("acq_date")
        .reset_index(drop=True)
    )
    history_df["fire_count"] = history_df["fire_count"].fillna(0).astype(int)
    return history_df
def predict_daily_fire_risk(target_date: Date):
    """
    High-level service: given a date, return model outputs + feature row.
    """
    history_df = build_daily_history(target_date)
    # Produce engineered features & extract last day as dict
    feature_row = get_latest_features_for_prediction(history_df)
    # Run both models
    result = predict_fire_risk(feature_row)
    return {
        "date": target_date.isoformat(),
        "features_used": feature_row,
        "models": result,
    }