# backend/app/Routes/Dashboard/weather.py
from flask import Blueprint, request, jsonify
from datetime import datetime, date
from app.extensions import db
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from . import bp_dashboard

def _weather_row_to_dict(w: OpenMeteoWeather) -> dict:
    return {
        "datetime": w.datetime.isoformat(),
        "tempmax": w.tempmax,
        "tempmin": w.tempmin,
        "humidity": w.humidity,
        "windspeed": w.windspeed,
        "precip": w.precip,
    }

def _to_date(s: str) -> date:
    return date.fromisoformat(s)

@bp_dashboard.route("/weather/daily")
def weather_daily():
    """
    GET /api/dashboard/weather/daily

    Query params:
        start (required, YYYY-MM-DD)
        end (required, YYYY-MM-DD)

    """
    req_start_str = request.args.get("start")
    req_end_str = request.args.get("end")

    if not req_start_str or not req_end_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400
    
    d0, d1 = _to_date(req_start_str), _to_date(req_end_str)

    weather_q = (db.session.query(OpenMeteoWeather)
         .filter(OpenMeteoWeather.datetime >= d0, OpenMeteoWeather.datetime <= d1)) # filter by date range
    
    weather_rows = weather_q.order_by(OpenMeteoWeather.datetime.asc()).all()
    payload = [_weather_row_to_dict(r) for r in weather_rows]

    return jsonify({
        "range": {
            "start": d0.isoformat(),
            "end": d1.isoformat(),
        },
        "count": weather_q.count(),
        "items": payload,
    }), 200

@bp_dashboard.route("/weather/summary")
def weather_summary():
    """
    GET /api/dashboard/weather/summary

    Query params:
        start (required, YYYY-MM-DD)
        end (required, YYYY-MM-DD)

    """
    req_start_str = request.args.get("start")
    req_end_str = request.args.get("end")

    if not req_start_str or not req_end_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400
    
    d0, d1 = _to_date(req_start_str), _to_date(req_end_str)

    weather_q = (db.session.query(OpenMeteoWeather)
         .filter(OpenMeteoWeather.datetime >= d0, OpenMeteoWeather.datetime <= d1)) # filter by date range
    
    weather_rows = weather_q.order_by(OpenMeteoWeather.datetime.asc()).all()
    days = weather_q.count()

    avg_tempmax = sum(r.tempmax for r in weather_rows if r.tempmax is not None) / days if days > 0 else None
    avg_tempmin = sum(r.tempmin for r in weather_rows if r.tempmin is not None) / days if days > 0 else None
    avg_humidity = sum(r.humidity for r in weather_rows if r.humidity is not None) / days if days > 0 else None
    avg_windspeed = sum(r.windspeed for r in weather_rows if r.windspeed is not None) / days if days > 0 else None
    total_precip = sum(r.precip for r in weather_rows if r.precip is not None) if days > 0 else None

    return jsonify({
        "range": {
            "start": d0.isoformat(),
            "end": d1.isoformat(),
        },
        "days": weather_q.count(),
        "avg_tempmax": avg_tempmax,
        "avg_tempmin": avg_tempmin,
        "avg_humidity": avg_humidity,
        "avg_windspeed": avg_windspeed,
        "total_precip": total_precip,
    }), 200