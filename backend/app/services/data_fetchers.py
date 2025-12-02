# backend/app/services/data_fetchers.py

from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Optional, Tuple

import io
import requests
import pandas as pd


# -----------------------------
# Open-Meteo (daily weather)
# -----------------------------

OPEN_METEO_BASE_URL = "https://archive-api.open-meteo.com/v1/archive"


def fetch_open_meteo_range(
    start: date,
    end: date,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    timezone: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch daily weather from Open-Meteo for [start, end] inclusive and
    return a DataFrame with columns:
      ['datetime', 'tempmax', 'tempmin', 'humidity', 'windspeed', 'precip']
    """
    if lat is None:
        lat = float(os.getenv("OPENMETEO_LAT", "30.2672"))
    if lon is None:
        lon = float(os.getenv("OPENMETEO_LON", "-97.7431"))
    if timezone is None:
        timezone = os.getenv("OPENMETEO_TIMEZONE", "America/Chicago")

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        # daily aggregated variables we care about
        "daily": ",".join(
            [
                "temperature_2m_max",
                "temperature_2m_min",
                "relative_humidity_2m_mean",
                "wind_speed_10m_max",
                "precipitation_sum",
            ]
        ),
        "timezone": timezone,
    }

    resp = requests.get(OPEN_METEO_BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    daily = data.get("daily")
    if not daily:
        return pd.DataFrame(
            columns=[
                "datetime",
                "tempmax",
                "tempmin",
                "humidity",
                "windspeed",
                "precip",
            ]
        )

    df = pd.DataFrame(daily)

    # Open-Meteo returns 'time' plus arrays for each daily variable
    df["datetime"] = pd.to_datetime(df["time"]).dt.date
    df = df.rename(
        columns={
            "temperature_2m_max": "tempmax",
            "temperature_2m_min": "tempmin",
            "relative_humidity_2m_mean": "humidity",
            "wind_speed_10m_max": "windspeed",
            "precipitation_sum": "precip",
        }
    )

    # Keep only the columns we store in the DB
    return df[
        [
            "datetime",
            "tempmax",
            "tempmin",
            "humidity",
            "windspeed",
            "precip",
        ]
    ]


# -----------------------------
# FIRMS (daily fire aggregates)
# -----------------------------

# NASA FIRMS area CSV endpoint (US/Canada URT/NRT API)
FIRMS_AREA_BASE_URL = "https://firms.modaps.eosdis.nasa.gov/usfs/api/area/csv"


def _firms_area_url_for_date(
    current_date: date, bbox: str, source: str, map_key: str
) -> str:
    """
    Build an area API URL for a single date and day_range=1.

    Docs pattern: /usfs/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]/[DATE]
    where DATE is the start date of the range. :contentReference[oaicite:2]{index=2}
    """
    return f"{FIRMS_AREA_BASE_URL}/{map_key}/{source}/{bbox}/1/{current_date.isoformat()}"


def fetch_travis_fires_daily_range(
    start: date,
    end: date,
    bbox: Optional[str] = None,
    source: Optional[str] = None,
    map_key: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch FIRMS fire detections for each day in [start, end] and aggregate to daily
    TravisFiresDaily format:

      acq_date, fire_count, avg_brightness, avg_confidence, avg_frp, label

    label: simple binary 1 if fire_count > 0, else 0.
    """
    if map_key is None:
        map_key = os.getenv("FIRMS_MAP_KEY")
    if not map_key:
        raise RuntimeError("FIRMS_MAP_KEY is not set in the environment")

    if bbox is None:
        bbox = os.getenv("TRAVIS_BBOX", "-98.20,30.00,-97.20,30.70")
    if source is None:
        # VIIRS SNPP NRT is a good default, but you can change to MODIS_SP etc.
        source = os.getenv("FIRMS_SOURCE", "VIIRS_SNPP_NRT")

    all_days = []

    day = start
    while day <= end:
        url = _firms_area_url_for_date(day, bbox, source, map_key)
        resp = requests.get(url, timeout=30)

        if resp.status_code == 204 or not resp.text.strip():
            # No detections this day
            all_days.append(
                {
                    "acq_date": day,
                    "fire_count": 0,
                    "avg_brightness": None,
                    "avg_confidence": None,
                    "avg_frp": None,
                    "label": 0,
                }
            )
            day += timedelta(days=1)
            continue

        resp.raise_for_status()

        # Parse CSV into DataFrame
        df = pd.read_csv(io.StringIO(resp.text))

        if df.empty:
            all_days.append(
                {
                    "acq_date": day,
                    "fire_count": 0,
                    "avg_brightness": None,
                    "avg_confidence": None,
                    "avg_frp": None,
                    "label": 0,
                }
            )
            day += timedelta(days=1)
            continue
        
        # --- CLEANUP: make confidence numeric, ignore text codes ---
        if "confidence" in df.columns:
            df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce")

        # Standard FIRMS columns differ slightly by sensor. Common patterns:
        # - brightness or bright_ti4
        # - confidence
        # - frp
        # - acq_date
        if "acq_date" not in df.columns:
            # Some sensors may return 'acq_date' anyway; if not, try 'daynight' etc.
            # Adjust here if needed depending on your notebook.
            raise RuntimeError(
                f"FIRMS response missing 'acq_date' column for date={day}"
            )

        # Normalize brightness column
        if "brightness" in df.columns:
            brightness_col = "brightness"
        elif "bright_ti4" in df.columns:
            brightness_col = "bright_ti4"
        else:
            brightness_col = None

        # Ensure date type
        df["acq_date"] = pd.to_datetime(df["acq_date"]).dt.date

        # Group by date just in case the endpoint returns a multi-day range
        grouped = df.groupby("acq_date")

        for this_date, group in grouped:
            fire_count = len(group)

            avg_brightness = (
                group[brightness_col].mean() if brightness_col and brightness_col in group else None
            )
            avg_confidence = (
                group["confidence"].mean() if "confidence" in group else None
            )
            avg_frp = group["frp"].mean() if "frp" in group else None

            all_days.append(
                {
                    "acq_date": this_date,
                    "fire_count": int(fire_count),
                    "avg_brightness": float(avg_brightness)
                    if avg_brightness is not None
                    else None,
                    "avg_confidence": float(avg_confidence)
                    if avg_confidence is not None
                    else None,
                    "avg_frp": float(avg_frp) if avg_frp is not None else None,
                    "label": 1 if fire_count > 0 else 0,
                }
            )

        day += timedelta(days=1)

    if not all_days:
        return pd.DataFrame(
            columns=[
                "acq_date",
                "fire_count",
                "avg_brightness",
                "avg_confidence",
                "avg_frp",
                "label",
            ]
        )

    return pd.DataFrame(all_days)
