import os
import requests
from datetime import datetime, timezone
from dateutil import parser as dateparse
from sqlalchemy.dialects.postgresql import insert
from app.extensions import db
from app.Models import RawDetection
from app.Models.ingest_state import IngestState

def _get_env(name, default=None, required=False):
    v = os.getenv(name, default)
    if required and not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v

def _parse_bbox(bbox_str):
    # "-98.20,30.00,-97.20,30.70" -> (lon_min, lat_min, lon_max, lat_max)
    parts = [p.strip() for p in bbox_str.split(",")]
    if len(parts) != 4:
        raise ValueError("TRAVIS_BBOX must be 'lon_min,lat_min,lon_max,lat_max'")
    return tuple(map(float, parts))

def _firms_url(source, bbox, start_iso):
    # Build a FIRMS API URL that limits by bbox and (optionally) start time.
    # Consult FIRMS docs for exact params for the chosen endpoint.
    # Example pattern (pseudo): /api/country/csv/{source}/{MAP_KEY}/{bbox}?start={start_iso}
    # If your selected endpoint is different, adjust here accordingly.
    base = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
    map_key = _get_env("MAP_KEY", required=True)
    bbox_str = ",".join(map(str, bbox))
    params = f"{source}/{map_key}/{bbox_str}"
    # If FIRMS endpoint supports time filtering, include `?start=...`
    q = f"?start={start_iso}" if start_iso else ""
    return f"{base}/{params}{q}"

def _latest_ts(source_id, bbox_str):
    state = IngestState.query.filter_by(source_id=source_id, bbox=bbox_str).first()
    return state.last_acq_ts_utc if state else None

def _update_latest_ts(source_id, bbox_str, candidate_ts):
    state = IngestState.query.filter_by(source_id=source_id, bbox=bbox_str).first()
    if not state:
        state = IngestState(source_id=source_id, bbox=bbox_str, last_acq_ts_utc=candidate_ts)
        db.session.add(state)
    else:
        if not state.last_acq_ts_utc or candidate_ts > state.last_acq_ts_utc:
            state.last_acq_ts_utc = candidate_ts
    db.session.commit()

def _row_to_mapping(csv_row):
    # Convert a parsed CSV row to RawDetection mapping.
    # Align keys to your RawDetection model fields.
    # Ensure acq_ts_utc is built from acq_date+acq_time as your schema expects.
    # (Pseudo; adapt to the exact CSV headers you get back.)
    acq_ts_utc = dateparse.parse(f"{csv_row['acq_date']} {csv_row['acq_time']}").replace(tzinfo=timezone.utc)
    return {
        "acq_ts_utc": acq_ts_utc,
        "source_id": csv_row["satellite"],           # or your chosen FIRMS field
        "processing_level": csv_row.get("proc", "NRT"),
        "latitude": float(csv_row["latitude"]),
        "longitude": float(csv_row["longitude"]),
        "geom": f"SRID=4326;POINT({csv_row['longitude']} {csv_row['latitude']})",
        # ... add other numeric/quality fields as defined in your RawDetection model ...
    }

from .celery_app import celery

@celery.task(name="app.tasks.firms_fetch.daily_fetch_for_travis")
def daily_fetch_for_travis():
    source = _get_env("FIRMS_SOURCE", required=True)      # e.g. VIIRS_NOAA20_NRT
    bbox_str = _get_env("TRAVIS_BBOX", required=True)     # "-98.20,30.00,-97.20,30.70"
    bbox = _parse_bbox(bbox_str)

    # 1) find the last stored timestamp (per source/bbox)
    last_ts = _latest_ts(source, bbox_str)
    start_iso = last_ts.isoformat() if last_ts else None

    # 2) call FIRMS only for new data (if FIRMS supports a start param)
    url = _firms_url(source, bbox, start_iso)
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()

    # 3) parse CSV -> rows (implement a robust parser; this is a sketch)
    lines = [l for l in resp.text.splitlines() if l.strip()]
    header = [h.strip() for h in lines[0].split(",")]
    rows = [dict(zip(header, r.split(","))) for r in lines[1:]]

    if not rows:
        return {"inserted": 0, "last_ts": last_ts.isoformat() if last_ts else None}

    # 4) upsert with ON CONFLICT DO NOTHING using your unique key (space-time+sat)
    # Make sure your RawDetection table has a unique constraint like uq_raw_spacetime_sat
    # and geometry columns/indexes as per your migration notes.
    # Build mappings and keep max ts to advance state.
    mappings = []
    max_ts = last_ts
    for r in rows:
        m = _row_to_mapping(r)
        mappings.append(m)
        if not max_ts or m["acq_ts_utc"] > max_ts:
            max_ts = m["acq_ts_utc"]

    stmt = insert(RawDetection).values(mappings)
    stmt = stmt.on_conflict_do_nothing(constraint="uq_raw_spacetime_sat")
    result = db.session.execute(stmt)
    db.session.commit()

    # 5) advance the per-source/bbox watermark (even if 0 new, keep previous)
    if max_ts:
        _update_latest_ts(source, bbox_str, max_ts)

    return {"inserted": getattr(result, "rowcount", 0), "advanced_to": max_ts.isoformat() if max_ts else None}