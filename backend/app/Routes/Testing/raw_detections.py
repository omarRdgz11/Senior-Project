# app/Routes/raw_detections.py
from datetime import date, time
from typing import Optional, Tuple

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import and_, or_
from app.extensions import db
from app.Models import RawDetection  # adjust import if your Models package differs

bp = Blueprint("raw_detections", __name__, url_prefix="/api")

def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return date.fromisoformat(s)  # "YYYY-MM-DD"
    except ValueError:
        return None

def _parse_time(s: Optional[str]) -> Optional[time]:
    if not s:
        return None
    # Accept "HH:MM" or "HH:MM:SS"
    try:
        return time.fromisoformat(s)
    except ValueError:
        return None

def _parse_bbox(s: Optional[str]) -> Optional[Tuple[float, float, float, float]]:
    # bbox = "west,south,east,north"  (lon_min, lat_min, lon_max, lat_max)
    if not s:
        return None
    try:
        west, south, east, north = [float(x.strip()) for x in s.split(",")]
        return west, south, east, north
    except Exception:
        return None

def _row_to_dict(r: RawDetection) -> dict:
    return {
        "id": r.id,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "bright_ti4": r.bright_ti4,
        "acq_date": r.acq_date.isoformat(),          # "YYYY-MM-DD"
        "acq_time": r.acq_time.isoformat(timespec="seconds"),  # "HH:MM:SS"
        "satellite": r.satellite,
        "confidence": r.confidence,
        "frp": r.frp,
        "timeofday": r.timeofday,  # "D" or "N"
    }

@bp.get("/raw-detections")
def list_raw_detections():
    """
    GET /api/raw-detections

    Query params (all optional):
      - start_date=YYYY-MM-DD
      - end_date=YYYY-MM-DD      (inclusive)
      - start_time=HH:MM[:SS]
      - end_time=HH:MM[:SS]      (inclusive)
      - bbox=west,south,east,north  (lon_min,lat_min,lon_max,lat_max)
      - satellite=N|J|N21|multiple comma-separated e.g. "N,J"
      - confidence=low|nominal|high|comma-separated
      - timeofday=D|N|comma-separated
      - min_frp, max_frp (floats)
      - page (1-based, default 1)
      - limit (default 100, max 1000)
      - sort=acq_datetime_desc (default) | acq_datetime_asc | frp_desc | frp_asc
    """
    q = RawDetection.query

    # Date/time filters
    start_date = _parse_date(request.args.get("start_date"))
    end_date = _parse_date(request.args.get("end_date"))
    start_time = _parse_time(request.args.get("start_time"))
    end_time = _parse_time(request.args.get("end_time"))

    if start_date:
        q = q.filter(RawDetection.acq_date >= start_date)
    if end_date:
        q = q.filter(RawDetection.acq_date <= end_date)
    if start_time:
        q = q.filter(RawDetection.acq_time >= start_time)
    if end_time:
        q = q.filter(RawDetection.acq_time <= end_time)

    # BBox (lon, lat)
    bbox = _parse_bbox(request.args.get("bbox"))
    if bbox:
        west, south, east, north = bbox
        q = q.filter(
            RawDetection.longitude.between(west, east),
            RawDetection.latitude.between(south, north),
        )

    # Categorical filters: allow comma-separated lists
    def parse_list(arg_name: str):
        raw = request.args.get(arg_name)
        if not raw:
            return None
        return [s.strip() for s in raw.split(",") if s.strip()]

    sats = parse_list("satellite")
    if sats:
        q = q.filter(RawDetection.satellite.in_(sats))

    confs = parse_list("confidence")
    if confs:
        q = q.filter(RawDetection.confidence.in_(confs))

    tparts = parse_list("timeofday")
    if tparts:
        q = q.filter(RawDetection.timeofday.in_(tparts))

    # FRP range
    try:
        min_frp = float(request.args.get("min_frp")) if request.args.get("min_frp") else None
        max_frp = float(request.args.get("max_frp")) if request.args.get("max_frp") else None
    except ValueError:
        min_frp = max_frp = None

    if min_frp is not None:
        q = q.filter(RawDetection.frp >= min_frp)
    if max_frp is not None:
        q = q.filter(RawDetection.frp <= max_frp)

    # Sorting
    sort = (request.args.get("sort") or "acq_datetime_desc").lower()
    if sort == "acq_datetime_asc":
        q = q.order_by(RawDetection.acq_date.asc(), RawDetection.acq_time.asc())
    elif sort == "frp_desc":
        q = q.order_by(RawDetection.frp.desc())
    elif sort == "frp_asc":
        q = q.order_by(RawDetection.frp.asc())
    else:
        q = q.order_by(RawDetection.acq_date.desc(), RawDetection.acq_time.desc())

    # Pagination
    def clamp(n, lo, hi):
        return max(lo, min(hi, n))

    try:
        limit = int(request.args.get("limit") or 100)
    except ValueError:
        limit = 100
    limit = clamp(limit, 1, 1000)

    try:
        page = int(request.args.get("page") or 1)
    except ValueError:
        page = 1
    page = max(1, page)

    total = q.count()
    items = q.offset((page - 1) * limit).limit(limit).all()

    payload = [_row_to_dict(r) for r in items]
    resp = jsonify({
        "items": payload,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (total + limit - 1) // limit
    })
    # Helpful for frontend tables that read total count from headers:
    resp.headers["X-Total-Count"] = str(total)
    return resp, 200


@bp.get("/raw-detections/<int:det_id>")
def get_raw_detection(det_id: int):
    r = RawDetection.query.get_or_404(det_id)
    return jsonify(_row_to_dict(r)), 200
