# backend/app/Routes/regions.py
from flask import Blueprint, request, jsonify
from datetime import date as Date
from app.extensions import db
from app.Models.Region import Region
from app.Models.Fire.fires_daily import FiresDaily
from app.Models.Weather.weather_daily_regional import WeatherDailyRegional
from app.Models.Fire.firms_viirs import FirmsVIIRS

regions_bp = Blueprint("regions", __name__, url_prefix="/api/regions")


def _to_date(s: str) -> Date:
    """Parse YYYY-MM-DD string to date."""
    try:
        return Date.fromisoformat(s)
    except ValueError:
        raise ValueError(f"Invalid date format: {s}. Expected YYYY-MM-DD")


@regions_bp.route("", methods=["GET"])
def list_regions():
    """
    GET /api/regions
    Returns list of all regions with metadata.
    """
    regions = Region.query.order_by(Region.slug).all()

    data = [
        {
            "slug": r.slug,
            "name": r.name,
            "center": {"lat": r.center_lat, "lon": r.center_lon},
            "bbox": {
                "west": r.bbox_w,
                "south": r.bbox_s,
                "east": r.bbox_e,
                "north": r.bbox_n,
            },
        }
        for r in regions
    ]

    return jsonify({"count": len(data), "regions": data})


@regions_bp.route("/<slug>/fires", methods=["GET"])
def get_region_fires(slug: str):
    """
    GET /api/regions/<slug>/fires?start=YYYY-MM-DD&end=YYYY-MM-DD
    Returns daily fire aggregates for a region.
    """
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    if not (start_str and end_str):
        return jsonify({"error": "start and end query params are required (YYYY-MM-DD)"}), 400

    try:
        start = _to_date(start_str)
        end = _to_date(end_str)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Find region
    region = Region.query.filter_by(slug=slug).first()
    if not region:
        return jsonify({"error": f"Region not found: {slug}"}), 404

    # Query fires_daily
    rows = (
        FiresDaily.query
        .filter(FiresDaily.region_id == region.id)
        .filter(FiresDaily.acq_date >= start, FiresDaily.acq_date <= end)
        .order_by(FiresDaily.acq_date)
        .all()
    )

    data = [
        {
            "date": r.acq_date.isoformat(),
            "fire_count": r.fire_count,
            "avg_brightness": r.avg_brightness,
            "avg_confidence": r.avg_confidence,
            "avg_frp": r.avg_frp,
            "label": r.label,
        }
        for r in rows
    ]

    return jsonify({
        "region": slug,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "count": len(data),
        "fires": data,
    })


@regions_bp.route("/<slug>/weather", methods=["GET"])
def get_region_weather(slug: str):
    """
    GET /api/regions/<slug>/weather?start=YYYY-MM-DD&end=YYYY-MM-DD
    Returns daily weather for a region.
    """
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    if not (start_str and end_str):
        return jsonify({"error": "start and end query params are required (YYYY-MM-DD)"}), 400

    try:
        start = _to_date(start_str)
        end = _to_date(end_str)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Find region
    region = Region.query.filter_by(slug=slug).first()
    if not region:
        return jsonify({"error": f"Region not found: {slug}"}), 404

    # Query weather_daily_regional
    rows = (
        WeatherDailyRegional.query
        .filter(WeatherDailyRegional.region_id == region.id)
        .filter(WeatherDailyRegional.date >= start, WeatherDailyRegional.date <= end)
        .order_by(WeatherDailyRegional.date)
        .all()
    )

    data = [
        {
            "date": r.date.isoformat(),
            "tempmax": r.tempmax,
            "tempmin": r.tempmin,
            "humidity": r.humidity,
            "windspeed": r.windspeed,
            "precip": r.precip,
        }
        for r in rows
    ]

    return jsonify({
        "region": slug,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "count": len(data),
        "weather": data,
    })


@regions_bp.route("/<slug>/map-firms", methods=["GET"])
def get_region_map_firms(slug: str):
    """
    GET /api/regions/<slug>/map-firms?start=YYYY-MM-DD&end=YYYY-MM-DD&min_conf=0&max=5000
    Convenience endpoint: uses region bbox to query firms_viirs for map display.
    """
    start_str = request.args.get("start")
    end_str = request.args.get("end")
    min_conf = float(request.args.get("min_conf", "0"))
    limit = int(request.args.get("max", "5000"))

    if not (start_str and end_str):
        return jsonify({"error": "start and end query params are required (YYYY-MM-DD)"}), 400

    try:
        start = _to_date(start_str)
        end = _to_date(end_str)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Find region
    region = Region.query.filter_by(slug=slug).first()
    if not region:
        return jsonify({"error": f"Region not found: {slug}"}), 404

    # Query firms_viirs using region bbox
    q = (
        db.session.query(FirmsVIIRS)
        .filter(FirmsVIIRS.acq_date >= start, FirmsVIIRS.acq_date <= end)
        .filter(FirmsVIIRS.latitude.between(region.bbox_s, region.bbox_n))
        .filter(FirmsVIIRS.longitude.between(region.bbox_w, region.bbox_e))
    )

    if min_conf > 0:
        q = q.filter(FirmsVIIRS.confidence >= min_conf)

    rows = q.order_by(FirmsVIIRS.acq_date.desc()).limit(limit).all()

    data = [
        {
            "lat": r.latitude,
            "lon": r.longitude,
            "date": r.acq_date.isoformat(),
            "conf": r.confidence,
            "sat": r.satellite,
            "dn": r.daynight,
        }
        for r in rows
    ]

    return jsonify({
        "region": slug,
        "count": len(data),
        "items": data,
    })
