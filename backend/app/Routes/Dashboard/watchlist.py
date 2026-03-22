# backend/app/Routes/Dashboard/watchlist.py
from flask import request, jsonify
from datetime import datetime, timedelta
from app.Models.Region import Region
from app.Models.Fire.fires_daily import FiresDaily
from app.Models.Weather.weather_daily_regional import WeatherDailyRegional
from . import bp_dashboard


def _risk(fires_last_24h: int, humidity: float, windspeed: float) -> tuple[float, str]:
    def norm_humidity(h): return 1 - min(max(h, 0), 100) / 100
    def norm_wind(w): return min(w / 40, 1)
    def norm_fires(f): return min(f / 40, 1)

    score = (norm_fires(fires_last_24h) + norm_humidity(humidity) + norm_wind(windspeed)) / 3
    label = "Low" if score < 0.33 else "Elevated" if score < 0.66 else "High"
    return round(score, 2), label


@bp_dashboard.route("/watchlist")
def watchlist():
    """
    GET /api/dashboard/watchlist?date=YYYY-MM-DD

    Returns one entry per region using multi-region tables.
    """
    req_date_str = request.args.get("date")
    if not req_date_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400

    try:
        req_date = datetime.strptime(req_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format (YYYY-MM-DD)"}), 400

    last_24h_date = req_date - timedelta(days=1)

    regions = Region.query.order_by(Region.name).all()
    items = []

    for region in regions:
        weather_q = WeatherDailyRegional.query.filter_by(
            region_id=region.id, date=req_date
        ).first()
        fire_q = FiresDaily.query.filter_by(
            region_id=region.id, acq_date=last_24h_date
        ).first()

        fires_last_24h = fire_q.fire_count if fire_q else 0
        humidity = weather_q.humidity if weather_q else 0
        windspeed = weather_q.windspeed if weather_q else 0

        _, label = _risk(fires_last_24h, humidity, windspeed)

        items.append({
            "name": region.name,
            "slug": region.slug,
            "risk": label,
            "hotspots": fires_last_24h,
            "windspeed": windspeed,
            "humidity": humidity,
        })

    return jsonify({"date": req_date.isoformat(), "items": items}), 200
