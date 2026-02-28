# backend/app/services/regional_features.py
"""
Shared service for fetching multi-region prediction features.
"""
from datetime import date as Date
import pandas as pd
from app.extensions import db
from app.Models.Region import Region
from app.Models.Fire.fires_daily import FiresDaily
from app.Models.Weather.weather_daily_regional import WeatherDailyRegional


def get_features_for_region(region_slug: str, target_date: Date) -> pd.DataFrame:
    """
    Fetch merged fire + weather daily history for a specific region up to target_date.

    Args:
        region_slug: Region slug (austin, dallas, houston, san_antonio)
        target_date: Date to fetch data up to (inclusive)

    Returns:
        DataFrame with columns: acq_date, fire_count, tempmax, tempmin, humidity, windspeed, precip
        Sorted by date, fire_count filled with 0 for missing dates.

    Raises:
        ValueError: If region not found
    """
    # Find region
    region = Region.query.filter_by(slug=region_slug).first()
    if not region:
        raise ValueError(f"Region not found: {region_slug}")

    # Query fires_daily
    fires = (
        db.session.query(
            FiresDaily.acq_date,
            FiresDaily.fire_count,
        )
        .filter(FiresDaily.region_id == region.id)
        .filter(FiresDaily.acq_date <= target_date)
        .order_by(FiresDaily.acq_date)
        .all()
    )

    fires_df = pd.DataFrame(fires, columns=["acq_date", "fire_count"])

    # Query weather_daily_regional
    weather = (
        db.session.query(
            WeatherDailyRegional.date.label("acq_date"),
            WeatherDailyRegional.tempmax,
            WeatherDailyRegional.tempmin,
            WeatherDailyRegional.humidity,
            WeatherDailyRegional.windspeed,
            WeatherDailyRegional.precip,
        )
        .filter(WeatherDailyRegional.region_id == region.id)
        .filter(WeatherDailyRegional.date <= target_date)
        .order_by(WeatherDailyRegional.date)
        .all()
    )

    weather_df = pd.DataFrame(
        weather,
        columns=["acq_date", "tempmax", "tempmin", "humidity", "windspeed", "precip"],
    )

    # Outer-merge on acq_date; fill missing fire_count with 0
    history_df = (
        pd.merge(weather_df, fires_df, on="acq_date", how="left")
        .sort_values("acq_date")
        .reset_index(drop=True)
    )
    history_df["fire_count"] = history_df["fire_count"].fillna(0).astype(int)

    return history_df
