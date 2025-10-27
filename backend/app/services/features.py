# backend/app/services/features.py
import math, datetime
import numpy as np
from typing import Union, Iterable
from sqlalchemy import text
from app.extensions import db
from app.Models.weather_daily import WeatherDaily
from app.model.bundle import load_bundle  # {model, complete_features, feature_means, threshold}

EARTH_R_KM = 6371.0088

# -----------------------------
# Geo helpers
# -----------------------------
def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * EARTH_R_KM * math.asin(math.sqrt(a))

def _bbox_for_radius(lat, lon, radius_km):
    dlat = radius_km / 111.32
    clen = max(1e-3, math.cos(math.radians(lat)))
    dlon = radius_km / (111.32 * clen)
    return (lat - dlat, lat + dlat, lon - dlon, lon + dlon)

# -----------------------------
# Date helpers
# -----------------------------
def _to_date(d: Union[str, datetime.date]) -> datetime.date:
    return d if isinstance(d, datetime.date) else datetime.date.fromisoformat(d)

def _prev_day(d: Union[str, datetime.date]) -> datetime.date:
    return _to_date(d) - datetime.timedelta(days=1)

# -----------------------------
# Helper: write into whichever feature key the model actually uses
# -----------------------------
def _set_feat_by_alias(feats: dict, complete: list[str], aliases: list[str], value):
    for name in aliases:
        if name in complete:
            feats[name] = value
            return name
    return None

# -----------------------------
# FIRMS counts + recency
# -----------------------------
def _count_firms_window(lat, lon, start_dt: datetime.date, end_dt_incl: datetime.date, radius_km: float) -> int:
    minlat, maxlat, minlon, maxlon = _bbox_for_radius(lat, lon, radius_km)
    q = text("""
        SELECT latitude, longitude
        FROM firms_viirs
        WHERE acq_date >= :start_dt AND acq_date <= :end_dt
          AND latitude  BETWEEN :minlat AND :maxlat
          AND longitude BETWEEN :minlon AND :maxlon
    """)
    rows = db.session.execute(q, {
        "start_dt": start_dt, "end_dt": end_dt_incl,
        "minlat": minlat, "maxlat": maxlat, "minlon": minlon, "maxlon": maxlon
    }).fetchall()
    return sum(1 for la, lo in rows if haversine_km(lat, lon, la, lo) <= radius_km)

def count_fires_last_n_days(lat, lon, radius_km, end_date: Union[str, datetime.date], n_days=7):
    end_prev = _prev_day(end_date)
    start_dt = end_prev - datetime.timedelta(days=n_days - 1)
    return _count_firms_window(lat, lon, start_dt, end_prev, radius_km)

def days_since_last_fire(lat, lon, radius_km, on_date: Union[str, datetime.date]) -> float | None:
    """
    Days from the most recent fire (<= yesterday) within radius_km to on_date.
    Returns None if none found (feature_means will remain).
    """
    d = _to_date(on_date)
    end_prev = d - datetime.timedelta(days=1)
    # Search a reasonable historical window (e.g., 365 days); tune as needed
    start_dt = end_prev - datetime.timedelta(days=365)
    minlat, maxlat, minlon, maxlon = _bbox_for_radius(lat, lon, radius_km)
    q = text("""
        SELECT acq_date, latitude, longitude
        FROM firms_viirs
        WHERE acq_date >= :start_dt AND acq_date <= :end_dt
          AND latitude  BETWEEN :minlat AND :maxlat
          AND longitude BETWEEN :minlon AND :maxlon
        ORDER BY acq_date DESC
        LIMIT 5000
    """)
    rows = db.session.execute(q, {
        "start_dt": start_dt, "end_dt": end_prev,
        "minlat": minlat, "maxlat": maxlat, "minlon": minlon, "maxlon": maxlon
    }).fetchall()
    for acq_date, la, lo in rows:
        if haversine_km(lat, lon, la, lo) <= radius_km:
            return float((d - acq_date).days)
    return None

# -----------------------------
# Weather retrieval & rollups
# -----------------------------
def _nearest_weather_series(lat, lon, end_date: Union[str, datetime.date], lookback_days=35):
    """
    Returns WeatherDaily rows for the lookback window ending at **yesterday**.
    Tries exact (lat,lon) first, else nearest within ~50km bbox.
    """
    end_prev = _prev_day(end_date)
    start_dt = end_prev - datetime.timedelta(days=lookback_days - 1)

    exact = (WeatherDaily.query
             .filter(WeatherDaily.latitude == lat, WeatherDaily.longitude == lon)
             .filter(WeatherDaily.date >= start_dt, WeatherDaily.date <= end_prev)
             .order_by(WeatherDaily.date).all())
    if exact:
        return exact

    minlat, maxlat, minlon, maxlon = _bbox_for_radius(lat, lon, 50.0)
    candidates = (WeatherDaily.query
                  .filter(WeatherDaily.date >= start_dt, WeatherDaily.date <= end_prev)
                  .filter(WeatherDaily.latitude.between(minlat, maxlat))
                  .filter(WeatherDaily.longitude.between(minlon, maxlon)).all())
    if not candidates:
        return []
    candidates.sort(key=lambda w: (w.date, haversine_km(lat, lon, w.latitude, w.longitude)))
    return candidates

def _rolling(vals: Iterable[float], window: int, agg="mean"):
    arr = [v for v in vals if v is not None]
    if not arr:
        return None
    window_slice = arr if len(arr) < window else arr[-window:]
    if not window_slice:
        return None
    if agg == "mean":
        return float(np.mean(window_slice))
    if agg == "sum":
        return float(np.sum(window_slice))
    return None

# -----------------------------
# Public: derive partial features (Level 2++) with more variation
# -----------------------------
def derive_features_level2(lat, lon, date_str: Union[str, datetime.date], radius_km=25):
    """
    - Start from feature_means (safe defaults)
    - Calendar: month/day/dayofyear
    - FIRMS: prev-day (1d), 7d, 30d counts + days_since_last_fire
    - Weather: prev-day & 7d/30d rollups (sum for precip, mean otherwise) for
               tempmax,tempmin,humidity,windspeed,precip + same-day snapshot if present
    Returns (feats, ordered)
    """
    bundle = load_bundle()
    complete = bundle["complete_features"]
    feats = dict(bundle["feature_means"])

    dt = _to_date(date_str)

    # Calendar
    _set_feat_by_alias(feats, complete, ["month"], dt.month)
    _set_feat_by_alias(feats, complete, ["day", "day_of_month"], dt.day)
    _set_feat_by_alias(feats, complete, ["dayofyear", "doy"], dt.timetuple().tm_yday)
    # Optional, if model has it: dayofweek / quarter
    _set_feat_by_alias(feats, complete, ["dayofweek", "dow"], dt.weekday())  # 0=Mon
    _set_feat_by_alias(feats, complete, ["quarter"], (dt.month - 1)//3 + 1)

    # FIRMS windows
    prev1  = count_fires_last_n_days(lat, lon, radius_km, dt, n_days=1)
    last7  = count_fires_last_n_days(lat, lon, radius_km, dt, n_days=7)
    last30 = count_fires_last_n_days(lat, lon, radius_km, dt, n_days=30)
    _set_feat_by_alias(feats, complete, ["firms_prev_day", "fires_prev_day", "firms_1d", "fires_1d"], float(prev1))
    _set_feat_by_alias(feats, complete, ["firms_7d", "fires_last_7days", "firms_last_7days"], float(last7))
    _set_feat_by_alias(feats, complete, ["firms_30d", "fires_last_30days", "firms_last_30days"], float(last30))

    # days_since_last_fire
    dslf = days_since_last_fire(lat, lon, radius_km, dt)
    if dslf is not None:
        _set_feat_by_alias(feats, complete, ["days_since_last_fire"], float(dslf))

    # Weather rollups (up to yesterday) + same-day if present
    series = _nearest_weather_series(lat, lon, dt, lookback_days=35)
    if series:
        series.sort(key=lambda w: w.date)
        dates   = [w.date for w in series]
        # Safely collect attributes; missing attrs stay None
        def col(attr): return [getattr(w, attr, None) for w in series]

        tmax    = col("tempmax")
        tmin    = col("tempmin")
        rh      = col("humidity")
        wind    = col("windspeed")
        ppt     = col("precip")

        yday = _prev_day(dt)
        def prev_val(vals):
            try:
                idx = dates.index(yday)
                return vals[idx]
            except ValueError:
                return vals[-1] if vals else None

        # prev-day snapshots
        pv = prev_val
        for aliases, arr in [
            (["tempmax_prev_day","tmax_prev_day","tmax_1d"], tmax),
            (["tempmin_prev_day","tmin_prev_day","tmin_1d"], tmin),
            (["humidity_prev_day","rh_prev_day"], rh),
            (["windspeed_prev_day","wind_prev_day","wind_1d"], wind),
            (["precip_prev_day","ppt_prev_day","ppt_1d"], ppt),
        ]:
            val = pv(arr)
            if val is not None:
                _set_feat_by_alias(feats, complete, aliases, float(val))

        # 7d means (sum for precip)
        for aliases, arr, agg in [
            (["tempmax_7d_avg","tmax_7d_mean"], tmax, "mean"),
            (["tempmin_7d_avg","tmin_7d_mean"], tmin, "mean"),
            (["humidity_7d_avg","rh_7d_mean"], rh, "mean"),
            (["windspeed_7d_avg","wind_7d_mean"], wind, "mean"),
            (["precip_7d_sum","ppt_7d_sum"], ppt, "sum"),
        ]:
            val = _rolling(arr, 7, agg)
            if val is not None:
                _set_feat_by_alias(feats, complete, aliases, float(val))

        # 30d means (sum for precip)
        for aliases, arr, agg in [
            (["tempmax_30d_avg","tmax_30d_mean"], tmax, "mean"),
            (["tempmin_30d_avg","tmin_30d_mean"], tmin, "mean"),
            (["humidity_30d_avg","rh_30d_mean"], rh, "mean"),
            (["windspeed_30d_avg","wind_30d_mean"], wind, "mean"),
            (["precip_30d_sum","ppt_30d_sum"], ppt, "sum"),
        ]:
            val = _rolling(arr, 30, agg)
            if val is not None:
                _set_feat_by_alias(feats, complete, aliases, float(val))

        # Same-day snapshot (if your model uses these exact names)
        # Try to fetch dt row (exact), else leave means
        same_day = next((w for w in series if w.date == dt), None)
        if same_day:
            for aliases, attr in [
                (["tempmax","tmax"], "tempmax"),
                (["tempmin","tmin"], "tempmin"),
                (["humidity","rh"], "humidity"),
                (["windspeed","wind"], "windspeed"),
                (["precip","ppt"], "precip"),
            ]:
                val = getattr(same_day, attr, None)
                if val is not None:
                    _set_feat_by_alias(feats, complete, aliases, float(val))

    # Ordered vector for the model
    ordered = [feats[c] for c in complete]
    return feats, ordered
