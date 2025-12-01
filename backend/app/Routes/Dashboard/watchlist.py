# backend/app/Routes/Dashboard/watchlist.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from app.Models.Fire.travis_fires_daily import TravisFiresDaily 
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from . import bp_dashboard

@bp_dashboard.route("/watchlist")
def watchlist():
    """
    GET /api/dashboard/watchlist

    Query params:
        - date (required, YYYY-MM-DD)
    """
    req_date_str = request.args.get("date")
    if not req_date_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400
    
    try:
        req_date = datetime.strptime(req_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format (YYYY-MM-DD)"}), 400
    
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
        "items": [
            {
                "name": "Travis County",
                "risk": label,
                "hotspots": fires_last_24h,
                "windspeed": windspeed,
                "humidity": humidity,
            }
        ],
    }), 200