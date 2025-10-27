# backend/app/routes/firms.py
from flask import Blueprint, request, jsonify
from datetime import date
from sqlalchemy import and_
from app.extensions import db
from app.Models.firms_viirs import FirmsVIIRS  # adjust import path if needed
import math

firms_bp = Blueprint("firms", __name__, url_prefix="/api/firms")

def _to_date(s: str) -> date:
    return date.fromisoformat(s)

def _bbox(bbox: str):
    # bbox = "minLon,minLat,maxLon,maxLat" (Leaflet order is usually [minLat, minLon, maxLat, maxLon]; be explicit)
    parts = [float(p) for p in bbox.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must be 'minLon,minLat,maxLon,maxLat'")
    minlon, minlat, maxlon, maxlat = parts
    return minlat, maxlat, minlon, maxlon

@firms_bp.route("", methods=["GET"])
def list_fires():
    """
    GET /api/firms?bbox=minLon,minLat,maxLon,maxLat&start=YYYY-MM-DD&end=YYYY-MM-DD&min_conf=0&max=5000
    Returns compact point list for plotting.
    """
    bbox = request.args.get("bbox")
    start = request.args.get("start")
    end   = request.args.get("end")
    min_conf = float(request.args.get("min_conf", "0"))
    limit = int(request.args.get("max", "5000"))

    if not (bbox and start and end):
        return jsonify({"error": "bbox,start,end are required"}), 400

    minlat, maxlat, minlon, maxlon = _bbox(bbox)
    d0, d1 = _to_date(start), _to_date(end)

    q = (db.session.query(FirmsVIIRS)
         .filter(FirmsVIIRS.acq_date >= d0, FirmsVIIRS.acq_date <= d1)
         .filter(FirmsVIIRS.latitude.between(minlat, maxlat))
         .filter(FirmsVIIRS.longitude.between(minlon, maxlon)))
    if min_conf > 0:
        q = q.filter(FirmsVIIRS.confidence >= min_conf)

    rows = (q.order_by(FirmsVIIRS.acq_date.desc())
              .limit(limit)
              .all())

    # Return lightweight array for markers or heatmap
    data = [
        {
            "lat": r.latitude,
            "lon": r.longitude,
            "date": r.acq_date.isoformat(),
            "conf": r.confidence,
            "sat": r.satellite,
            "dn": r.daynight,    # "D" or "N"
        }
        for r in rows
    ]
    return jsonify({"count": len(data), "items": data})
