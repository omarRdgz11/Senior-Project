# backend/app/Routes/Dashboard/fires.py
from flask import Blueprint, request, jsonify
from datetime import timedelta, date
from app.extensions import db
from app.Models.Fire.travis_fires_daily import TravisFiresDaily 
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

def _to_date(s: str) -> date:
    return date.fromisoformat(s)

@bp_dashboard.route("/fires/daily")
def fires_daily():
    """
    GET /api/dashboard/fires/daily

    Query params:
        start (required, YYYY-MM-DD)
        end (required, YYYY-MM-DD)

    """
    req_start_str = request.args.get("start")
    req_end_str = request.args.get("end")

    if not req_start_str or not req_end_str:
        return jsonify({"error": "date parameter is required (YYYY-MM-DD)"}), 400
    
    d0, d1 = _to_date(req_start_str), _to_date(req_end_str)

    fire_q = (db.session.query(TravisFiresDaily)
         .filter(TravisFiresDaily.acq_date >= d0, TravisFiresDaily.acq_date <= d1)) # filter by date range
    
    fire_rows = fire_q.order_by(TravisFiresDaily.acq_date.asc()).all()

    return jsonify({
        "range": {
            "start": d0.isoformat(),
            "end": d1.isoformat(),
        },
        "count": fire_q.count(),
        "items": [
            {
                "date": r.acq_date.isoformat(), 
                "fires": r.fire_count,
            } 
            for r in fire_rows      
        ],
    }), 200

@bp_dashboard.route("/fires/summary")
def fires_summary():
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

    fires_q = (db.session.query(TravisFiresDaily)
         .filter(TravisFiresDaily.acq_date >= d0, TravisFiresDaily.acq_date <= d1)) # filter by date range
    
    fires_rows = fires_q.order_by(TravisFiresDaily.acq_date.asc()).all()

    total_fire_count = sum(r.fire_count for r in fires_rows)

    # Fires in the last 24h
    last_24h_date = d0 - timedelta(days=1)
    last_24h_date_q = TravisFiresDaily.query.filter_by(acq_date=last_24h_date).first()
    fires_last_24h = last_24h_date_q.fire_count if last_24h_date_q else 0

   
    return jsonify({
        "range": {
            "start": d0.isoformat(),
            "end": d1.isoformat(),
        },
        "total_fires": total_fire_count,
        "fires_last_24h": fires_last_24h,
    }), 200