from flask import Blueprint, request, jsonify
from datetime import date
from app.extensions import db
from sqlalchemy import func
from . import bp_dashboard

from app.Models.Fire.travis_fires_daily import TravisFiresDaily
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather

def _to_date(s: str) -> date:
    return date.fromisoformat(s)

@bp_dashboard.route("/insights")
def get_insights():
    req_start_str = request.args.get("start")
    req_end_str = request.args.get("end")

    if not req_start_str or not req_end_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400
    
    d0, d1 = _to_date(req_start_str), _to_date(req_end_str)

    fires_q = (db.session.query(TravisFiresDaily)
         .filter(TravisFiresDaily.acq_date >= d0, TravisFiresDaily.acq_date <= d1)) # filter by date range

    fires_rows = fires_q.order_by(TravisFiresDaily.acq_date.asc()).all()
    fires_days = fires_q.count()

    total_fires = sum(r.fire_count for r in fires_rows)
    avg_daily_fires = total_fires / fires_days if fires_days > 0 else 0

    # ---- Weather Summary ----
    weather_q = (db.session.query(OpenMeteoWeather)
         .filter(OpenMeteoWeather.datetime >= d0, OpenMeteoWeather.datetime <= d1)) # filter by date range
    
    weather_rows = weather_q.order_by(OpenMeteoWeather.datetime.asc()).all()
    weather_days = weather_q.count()
    
    avg_tempmax = sum(r.tempmax for r in weather_rows if r.tempmax is not None) / weather_days if weather_days > 0 else None
    avg_tempmin = sum(r.tempmin for r in weather_rows if r.tempmin is not None) / weather_days if weather_days > 0 else None
    avg_humidity = sum(r.humidity for r in weather_rows if r.humidity is not None) / weather_days if weather_days > 0 else None
    avg_windspeed = sum(r.windspeed for r in weather_rows if r.windspeed is not None) / weather_days if weather_days > 0 else None

    # ---- Build Messages ----
    messages = [
        f"Between {d0} and {d1}, the area recorded {total_fires} fires (avg {avg_daily_fires}/day).",
        f"Temperatures ranged from {avg_tempmin}°C to {avg_tempmax}°C and humidity {avg_humidity}%.",
        f"Wind speeds averaged {avg_windspeed} m/s, indicating modest spread potential.",
    ]

    return jsonify({
        "range": {
            "start": d0.isoformat(),
            "end": d1.isoformat()
        },
        "messages": messages
    }), 200
