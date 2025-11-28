# features.py

import pandas as pd
import numpy as np


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Take a DataFrame of RAW daily data and add all engineered features.

    Expected input columns:
        - acq_date  (datetime64)  # or 'date' that you rename to 'acq_date'
        - fire_count  (int: number of fires that day in Travis County)
        - tempmax     (float)
        - tempmin     (float)
        - humidity    (float, 0–100)
        - windspeed   (float)
        - precip      (float, mm or inches – same as training)

    Returns:
        DataFrame sorted by date, with all features required by the models.
        You will usually take the LAST ROW for prediction.
    """

    df = df.copy()

    # Ensure datetime + sorted
    df["acq_date"] = pd.to_datetime(df["acq_date"])
    df = df.sort_values("acq_date").reset_index(drop=True)

   #temporral features
    df["month"] = df["acq_date"].dt.month
    df["dayofyear"] = df["acq_date"].dt.dayofyear
    df["dayofweek"] = df["acq_date"].dt.dayofweek
    df["quarter"] = df["acq_date"].dt.quarter

   #previous day lagged weather features
    df["tempmax_prev_day"] = df["tempmax"].shift(1)
    df["tempmin_prev_day"] = df["tempmin"].shift(1)
    df["humidity_prev_day"] = df["humidity"].shift(1)
    df["windspeed_prev_day"] = df["windspeed"].shift(1)
    df["precip_prev_day"] = df["precip"].shift(1)

    #fire history features

    # Fire counts in previous 7 and 30 days (do NOT include today)
    df["fires_last_7days"] = df["fire_count"].rolling(7, min_periods=1).sum().shift(1)
    df["fires_last_30days"] = df["fire_count"].rolling(30, min_periods=1).sum().shift(1)

    # Days since last fire (0 if today has fire, increasing otherwise)
    last_fire_date = df["acq_date"].where(df["fire_count"] > 0).ffill()
    df["days_since_last_fire"] = (
        (df["acq_date"] - last_fire_date).dt.days.fillna(0).astype(int)
    )

    # Average fires by calendar month & quarter 
    df["month_avg_fires"] = df.groupby("month")["fire_count"].transform("mean")
    df["quarter_avg_fires"] = df.groupby("quarter")["fire_count"].transform("mean")

    #rolling weather 7 days
    df["tempmax_7d_avg"] = df["tempmax"].rolling(7, min_periods=1).mean().shift(1)
    df["tempmin_7d_avg"] = df["tempmin"].rolling(7, min_periods=1).mean().shift(1)
    df["humidity_7d_avg"] = df["humidity"].rolling(7, min_periods=1).mean().shift(1)
    df["windspeed_7d_avg"] = df["windspeed"].rolling(7, min_periods=1).mean().shift(1)
    df["precip_7d_sum"] = df["precip"].rolling(7, min_periods=1).sum().shift(1)

    #rolling weather (30 days)
    df["tempmax_30d_avg"] = df["tempmax"].rolling(30, min_periods=1).mean().shift(1)
    df["tempmin_30d_avg"] = df["tempmin"].rolling(30, min_periods=1).mean().shift(1)
    df["humidity_30d_avg"] = df["humidity"].rolling(30, min_periods=1).mean().shift(1)
    df["windspeed_30d_avg"] = df["windspeed"].rolling(30, min_periods=1).mean().shift(1)
    df["precip_30d_sum"] = df["precip"].rolling(30, min_periods=1).sum().shift(1)

   #advanced features

    # Temperature × dryness (yesterday)
    df["temp_humidity_interaction"] = (
        df["tempmax_prev_day"] * (100 - df["humidity_prev_day"])
    )

    # Daily temperature range (yesterday)
    df["temp_range"] = df["tempmax_prev_day"] - df["tempmin_prev_day"]

    # Simple drought proxy: hot + low rain over last 30 days
    df["drought_index"] = df["tempmax_30d_avg"] / (df["precip_30d_sum"] + 1)

    # Wind × dryness (yesterday)
    df["wind_dry_index"] = (
        df["windspeed_prev_day"] * (100 - df["humidity_prev_day"])
    )

    # Seasonal flags
    df["is_summer"] = df["month"].isin([6, 7, 8]).astype(int)
    df["is_fire_season"] = df["month"].isin([7, 8, 9, 10]).astype(int)

    # Consecutive dry days (no/very little rain), based on precip < 0.1
    dry_day = (df["precip"] < 0.1).astype(int)
    group = (dry_day != dry_day.shift()).cumsum()
    consec = dry_day.groupby(group).cumsum()
    # Shift so today's value = number of dry days *before* today
    df["consecutive_dry_days"] = consec.shift(1).fillna(0).astype(int)

    # Drop rows that can't have full features (start of series)
    df = df.dropna().reset_index(drop=True)

    return df


def get_latest_features_for_prediction(df: pd.DataFrame) -> dict:
    """
    Convenience function:
      - runs full feature engineering on the provided history
      - returns a SINGLE row (dict) for the most recent date,
        ready to be passed into predict_fire_risk().
    """
    features_df = engineer_features(df)
    latest_row = features_df.iloc[-1]
    return latest_row.to_dict()
