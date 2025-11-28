from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app.Models.Fire.travis_fires_daily import TravisFiresDaily 
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from . import bp_dashboard

def _fire_row_to_dict(f: TravisFiresDaily) -> dict:
    return {
        "acq_date": f.acq_date.isoformat(),
        "fire_count": f.fire_count,
        "avg_brightness": f.avg_brightness,
        "avg_confidence": f.avg_confidence,
        "avg_frp": f.avg_frp,
        "label": f.label,
    }

def _weather_row_to_dict(w: OpenMeteoWeather) -> dict:
    return {
        "datetime": w.datetime.isoformat(),
        "tempmax": w.tempmax,
        "tempmin": w.tempmin,
        "humidity": w.humidity,
        "windspeed": w.windspeed,
        "precip": w.precip,
    }

@bp_dashboard.get("/overview")
def overview():
    """
    GET /api/dashboard/overview

    Query params:
        - date (required, YYYY-MM-DD)
            Interpreted as the “current dashboard date”
            “Last 24h” means (date - 1 day, date]

    """
    req_date_str = request.args.get("date")
    if not req_date_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400
    
    try:
        req_date = datetime.strptime(req_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format (YYYY-MM-DD)"}), 400
    
    fire_q = TravisFiresDaily.query.filter_by(acq_date=req_date).first()
    weather_q = OpenMeteoWeather.query.filter_by(datetime=req_date).first()

    # Fires in the last 24h
    last_24h_date = req_date - timedelta(days=1)
    last_24h_date_q = TravisFiresDaily.query.filter_by(acq_date=last_24h_date).first()
    fires_last_24h = last_24h_date_q.fire_count if last_24h_date_q else 0

    humidity = weather_q.humidity if weather_q else 0
    windspeed = weather_q.windspeed if weather_q else 0

    # Risk score - calculated as average of normalized drivers
    def norm_humidity(h): return 1 - min(max(h, 0), 100) / 100
    def norm_wind(w): return min(w / 40, 1)
    def norm_fires(f): return min(f / 40, 1)

    risk_score = (
        norm_fires(fires_last_24h) +
        norm_humidity(humidity) +
        norm_wind(windspeed)
    ) / 3

    # Risk label based on score
    label = (
        "Low" if risk_score < 0.33 else
        "Elevated" if risk_score < 0.66 else
        "High"
    )

    return jsonify({
        "date": req_date.isoformat(),
        "region": "Travis County",
        "risk": {
            "score": round(risk_score, 2),
            "label": label,
            "fires_last_24h": fires_last_24h,
            "drivers": {
                "avg_humidity": humidity,
                "avg_wind": windspeed,
            }
        },
        "weather": _weather_row_to_dict(weather_q) if weather_q else None,
    }), 200