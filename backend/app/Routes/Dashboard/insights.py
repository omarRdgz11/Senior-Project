# backend/app/Routes/Dashboard/insights.py
from flask import request, jsonify
from datetime import date as Date
from app.extensions import db
from . import bp_dashboard
from app.Models.Region import Region
from app.Models.Fire.fires_daily import FiresDaily
from app.Models.Weather.weather_daily_regional import WeatherDailyRegional
# Legacy Austin-only fallback
from app.Models.Fire.travis_fires_daily import TravisFiresDaily
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather


def _to_date(s: str) -> Date:
    return Date.fromisoformat(s)


def _fmt(val, prec: int = 1):
    """Format a nullable float; return '—' if None."""
    return round(val, prec) if val is not None else "—"


@bp_dashboard.route("/insights")
def get_insights():
    """
    GET /api/dashboard/insights?start=YYYY-MM-DD&end=YYYY-MM-DD[&region=<slug>]

    Uses multi-region tables when region is provided; falls back to legacy
    Travis County tables otherwise.
    """
    req_start_str = request.args.get("start")
    req_end_str = request.args.get("end")

    if not req_start_str or not req_end_str:
        return jsonify({"error": "start and end parameters are required (YYYY-MM-DD)"}), 400

    d0, d1 = _to_date(req_start_str), _to_date(req_end_str)
    region_slug = request.args.get("region")
    region_obj = Region.query.filter_by(slug=region_slug).first() if region_slug else None

    if region_obj:
        # ---- Multi-region path ----
        fires_rows = (
            FiresDaily.query
            .filter(FiresDaily.region_id == region_obj.id)
            .filter(FiresDaily.acq_date >= d0, FiresDaily.acq_date <= d1)
            .order_by(FiresDaily.acq_date.asc())
            .all()
        )
        weather_rows = (
            WeatherDailyRegional.query
            .filter(WeatherDailyRegional.region_id == region_obj.id)
            .filter(WeatherDailyRegional.date >= d0, WeatherDailyRegional.date <= d1)
            .order_by(WeatherDailyRegional.date.asc())
            .all()
        )
        fires_days = len(fires_rows)
        weather_days = len(weather_rows)

        total_fires = sum(r.fire_count for r in fires_rows)
        avg_daily_fires = round(total_fires / fires_days, 1) if fires_days > 0 else 0

        avg_tempmax = (sum(r.tempmax for r in weather_rows if r.tempmax is not None) / weather_days) if weather_days > 0 else None
        avg_tempmin = (sum(r.tempmin for r in weather_rows if r.tempmin is not None) / weather_days) if weather_days > 0 else None
        avg_humidity = (sum(r.humidity for r in weather_rows if r.humidity is not None) / weather_days) if weather_days > 0 else None
        avg_windspeed = (sum(r.windspeed for r in weather_rows if r.windspeed is not None) / weather_days) if weather_days > 0 else None
    else:
        # ---- Legacy Austin fallback ----
        fires_rows = (
            db.session.query(TravisFiresDaily)
            .filter(TravisFiresDaily.acq_date >= d0, TravisFiresDaily.acq_date <= d1)
            .order_by(TravisFiresDaily.acq_date.asc())
            .all()
        )
        weather_rows = (
            db.session.query(OpenMeteoWeather)
            .filter(OpenMeteoWeather.datetime >= d0, OpenMeteoWeather.datetime <= d1)
            .order_by(OpenMeteoWeather.datetime.asc())
            .all()
        )
        fires_days = len(fires_rows)
        weather_days = len(weather_rows)

        total_fires = sum(r.fire_count for r in fires_rows)
        avg_daily_fires = round(total_fires / fires_days, 1) if fires_days > 0 else 0

        avg_tempmax = (sum(r.tempmax for r in weather_rows if r.tempmax is not None) / weather_days) if weather_days > 0 else None
        avg_tempmin = (sum(r.tempmin for r in weather_rows if r.tempmin is not None) / weather_days) if weather_days > 0 else None
        avg_humidity = (sum(r.humidity for r in weather_rows if r.humidity is not None) / weather_days) if weather_days > 0 else None
        avg_windspeed = (sum(r.windspeed for r in weather_rows if r.windspeed is not None) / weather_days) if weather_days > 0 else None

    messages = [
        f"Between {d0} and {d1}, the area recorded {total_fires} fires (avg {avg_daily_fires}/day).",
        f"Temperatures ranged from {_fmt(avg_tempmin)}°C to {_fmt(avg_tempmax)}°C with avg humidity {_fmt(avg_humidity)}%.",
        f"Wind speeds averaged {_fmt(avg_windspeed)} km/h, indicating {'elevated' if (avg_windspeed or 0) > 25 else 'modest'} spread potential.",
    ]

    return jsonify({
        "range": {"start": d0.isoformat(), "end": d1.isoformat()},
        "messages": messages,
    }), 200
