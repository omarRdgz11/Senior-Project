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


def fetch_travis_fires_daily_range(
    start: date,
    end: date,
    bbox: Optional[str] = None,
    source: Optional[str] = None,
    map_key: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch FIRMS fire detections for [start, end] in batched windows and aggregate to daily.

    Uses FIRMS USFS Area API with DAY_RANGE windows (max 5 days per request) to minimize API calls.
    URL pattern: /usfs/api/area/csv/[MAP_KEY]/[SOURCE]/[BBOX]/[DAY_RANGE]/[DATE]

    Returns DataFrame with: acq_date, fire_count, avg_brightness, avg_confidence, avg_frp, label
    All dates in range will have rows (fire_count=0 if no detections).
    """
    if map_key is None:
        map_key = os.getenv("FIRMS_MAP_KEY")
    if not map_key:
        raise RuntimeError("FIRMS_MAP_KEY is not set in the environment")

    if bbox is None:
        bbox = os.getenv("TRAVIS_BBOX", "-98.20,30.00,-97.20,30.70")
    if source is None:
        source = os.getenv("FIRMS_SOURCE", "VIIRS_SNPP_NRT")

    # Dictionary to store results by date
    daily_results = {}

    # Batch requests in windows of up to 5 days
    MAX_WINDOW = 5
    window_start = start

    while window_start <= end:
        # Calculate window size (max 5 days or remaining days)
        days_remaining = (end - window_start).days + 1
        window_size = min(MAX_WINDOW, days_remaining)
        window_end = window_start + timedelta(days=window_size - 1)

        # Build URL for this window
        url = f"{FIRMS_AREA_BASE_URL}/{map_key}/{source}/{bbox}/{window_size}/{window_start.isoformat()}"

        try:
            resp = requests.get(url, timeout=30)

            if resp.status_code == 204 or not resp.text.strip():
                # No detections in this window - mark all days as zero
                current_day = window_start
                while current_day <= window_end:
                    daily_results[current_day] = {
                        "acq_date": current_day,
                        "fire_count": 0,
                        "avg_brightness": None,
                        "avg_confidence": None,
                        "avg_frp": None,
                        "label": 0,
                    }
                    current_day += timedelta(days=1)
                window_start = window_end + timedelta(days=1)
                continue

            resp.raise_for_status()

            # Parse CSV into DataFrame
            df = pd.read_csv(io.StringIO(resp.text))

            if df.empty:
                # No detections - mark all days in window as zero
                current_day = window_start
                while current_day <= window_end:
                    daily_results[current_day] = {
                        "acq_date": current_day,
                        "fire_count": 0,
                        "avg_brightness": None,
                        "avg_confidence": None,
                        "avg_frp": None,
                        "label": 0,
                    }
                    current_day += timedelta(days=1)
                window_start = window_end + timedelta(days=1)
                continue

            # --- CLEANUP: make confidence numeric, ignore text codes ---
            if "confidence" in df.columns:
                df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce")

            # Ensure acq_date exists
            if "acq_date" not in df.columns:
                raise RuntimeError(
                    f"FIRMS response missing 'acq_date' column for window {window_start}-{window_end}"
                )

            # Normalize brightness column
            brightness_col = None
            if "brightness" in df.columns:
                brightness_col = "brightness"
            elif "bright_ti4" in df.columns:
                brightness_col = "bright_ti4"

            # Parse dates
            df["acq_date"] = pd.to_datetime(df["acq_date"]).dt.date

            # Group by date and aggregate
            grouped = df.groupby("acq_date")

            for this_date, group in grouped:
                fire_count = len(group)
                avg_brightness = (
                    group[brightness_col].mean()
                    if brightness_col and brightness_col in group.columns
                    else None
                )
                avg_confidence = (
                    group["confidence"].mean() if "confidence" in group.columns else None
                )
                avg_frp = group["frp"].mean() if "frp" in group.columns else None

                daily_results[this_date] = {
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

            # Fill in any missing days in this window with zeros
            current_day = window_start
            while current_day <= window_end:
                if current_day not in daily_results:
                    daily_results[current_day] = {
                        "acq_date": current_day,
                        "fire_count": 0,
                        "avg_brightness": None,
                        "avg_confidence": None,
                        "avg_frp": None,
                        "label": 0,
                    }
                current_day += timedelta(days=1)

        except Exception as e:
            # On error, log and mark days as zero to continue
            print(f"Error fetching FIRMS data for window {window_start}-{window_end}: {e}")
            current_day = window_start
            while current_day <= window_end:
                if current_day not in daily_results:
                    daily_results[current_day] = {
                        "acq_date": current_day,
                        "fire_count": 0,
                        "avg_brightness": None,
                        "avg_confidence": None,
                        "avg_frp": None,
                        "label": 0,
                    }
                current_day += timedelta(days=1)

        # Move to next window
        window_start = window_end + timedelta(days=1)

    # Convert to DataFrame and sort by date
    if not daily_results:
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

    result_df = pd.DataFrame(list(daily_results.values()))
    result_df = result_df.sort_values("acq_date").reset_index(drop=True)

    return result_df


# -----------------------------
# Multi-region functions
# -----------------------------


def fetch_open_meteo_range_for_region(
    region,
    start: date,
    end: date,
    timezone: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch daily weather from Open-Meteo for a specific region.

    Args:
        region: Region model instance with center_lat, center_lon
        start: start date (inclusive)
        end: end date (inclusive)
        timezone: optional timezone string (default: America/Chicago)

    Returns:
        DataFrame with columns: ['date', 'tempmax', 'tempmin', 'humidity', 'windspeed', 'precip']
    """
    df = fetch_open_meteo_range(
        start=start,
        end=end,
        lat=region.center_lat,
        lon=region.center_lon,
        timezone=timezone,
    )

    # Rename 'datetime' to 'date' for consistency with new table schema
    if "datetime" in df.columns:
        df = df.rename(columns={"datetime": "date"})

    return df


def fetch_fires_daily_range_for_region(
    region,
    start: date,
    end: date,
    source: Optional[str] = None,
    map_key: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch FIRMS fire detections for a specific region and aggregate to daily format.

    Args:
        region: Region model instance with bbox_w, bbox_s, bbox_e, bbox_n
        start: start date (inclusive)
        end: end date (inclusive)
        source: FIRMS source (e.g., VIIRS_SNPP_NRT)
        map_key: FIRMS API key

    Returns:
        DataFrame with columns: ['acq_date', 'fire_count', 'avg_brightness', 'avg_confidence', 'avg_frp', 'label']
    """
    bbox = region.bbox_string()
    return fetch_travis_fires_daily_range(
        start=start,
        end=end,
        bbox=bbox,
        source=source,
        map_key=map_key,
    )
