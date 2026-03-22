# backend/app/Routes/Dashboard/overview.py
from flask import request, jsonify
from datetime import datetime, timedelta
from app.Models.Region import Region
from app.Models.Fire.fires_daily import FiresDaily
from app.Models.Weather.weather_daily_regional import WeatherDailyRegional
# Legacy Austin-only tables kept as fallback
from app.Models.Fire.travis_fires_daily import TravisFiresDaily
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from . import bp_dashboard


def _norm_humidity(h): return 1 - min(max(h, 0), 100) / 100
def _norm_wind(w): return min(w / 40, 1)
def _norm_fires(f): return min(f / 40, 1)


@bp_dashboard.get("/overview")
def overview():
    """
    GET /api/dashboard/overview?date=YYYY-MM-DD[&region=<slug>]

    If region is provided, uses multi-region tables (fires_daily,
    weather_daily_regional).  Falls back to the legacy Travis County
    tables when no region is given or the slug is not found.
    """
    req_date_str = request.args.get("date")
    if not req_date_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400

    try:
        req_date = datetime.strptime(req_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format (YYYY-MM-DD)"}), 400

    region_slug = request.args.get("region")
    last_24h_date = req_date - timedelta(days=1)

    region_obj = Region.query.filter_by(slug=region_slug).first() if region_slug else None

    if region_obj:
        # ---- Multi-region path ----
        fire_q = FiresDaily.query.filter_by(region_id=region_obj.id, acq_date=req_date).first()
        weather_q = WeatherDailyRegional.query.filter_by(region_id=region_obj.id, date=req_date).first()
        last_24h_q = FiresDaily.query.filter_by(region_id=region_obj.id, acq_date=last_24h_date).first()
        region_name = region_obj.name

        humidity = weather_q.humidity if weather_q else 0
        windspeed = weather_q.windspeed if weather_q else 0
        fires_last_24h = last_24h_q.fire_count if last_24h_q else 0

        weather_dict = {
            "datetime": weather_q.date.isoformat(),
            "tempmax": weather_q.tempmax,
            "tempmin": weather_q.tempmin,
            "humidity": weather_q.humidity,
            "windspeed": weather_q.windspeed,
            "precip": weather_q.precip,
        } if weather_q else None
    else:
        # ---- Legacy Austin fallback ----
        weather_q = OpenMeteoWeather.query.filter_by(datetime=req_date).first()
        last_24h_q = TravisFiresDaily.query.filter_by(acq_date=last_24h_date).first()
        region_name = "Travis County"

        humidity = weather_q.humidity if weather_q else 0
        windspeed = weather_q.windspeed if weather_q else 0
        fires_last_24h = last_24h_q.fire_count if last_24h_q else 0

        weather_dict = {
            "datetime": weather_q.datetime.isoformat(),
            "tempmax": weather_q.tempmax,
            "tempmin": weather_q.tempmin,
            "humidity": weather_q.humidity,
            "windspeed": weather_q.windspeed,
            "precip": weather_q.precip,
        } if weather_q else None

    risk_score = (
        _norm_fires(fires_last_24h) +
        _norm_humidity(humidity) +
        _norm_wind(windspeed)
    ) / 3

    label = "Low" if risk_score < 0.33 else "Elevated" if risk_score < 0.66 else "High"

    return jsonify({
        "date": req_date.isoformat(),
        "region": region_name,
        "risk": {
            "score": round(risk_score, 2),
            "label": label,
            "fires_last_24h": fires_last_24h,
            "drivers": {
                "avg_humidity": humidity,
                "avg_wind": windspeed,
            },
        },
        "weather": weather_dict,
    }), 200
