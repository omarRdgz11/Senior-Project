# backend/app/routes/grid.py
from flask import Blueprint, request, jsonify
from datetime import date
from app.services.features import derive_features_level2
from app.model.infer import predict_from_features

grid_bp = Blueprint("grid", __name__, url_prefix="/api/grid")

def _to_date(s): return date.fromisoformat(s)

@grid_bp.route("/predict", methods=["GET"])
def grid_predict():
    """
    GET /api/grid/predict?bbox=minLon,minLat,maxLon,maxLat&date=YYYY-MM-DD&step_deg=0.05&radius_km=25
    Returns centers + probability per cell.
    """
    bbox = request.args.get("bbox")
    iso  = request.args.get("date")
    step = float(request.args.get("step_deg", "0.05"))  # ~5-6km latitude-wise
    radius = float(request.args.get("radius_km", "25"))

    if not (bbox and iso):
        return jsonify({"error": "bbox,date are required"}), 400

    minlon, minlat, maxlon, maxlat = [float(x) for x in bbox.split(",")]
    lats, lons = [], []
    lat = minlat
    while lat <= maxlat:
        lon = minlon
        while lon <= maxlon:
            lats.append(round(lat, 4)); lons.append(round(lon, 4))
            lon += step
        lat += step

    cells = []
    for la, lo in zip(lats, lons):
        feats, _ = derive_features_level2(la, lo, iso, radius_km=radius)
        pred = predict_from_features(feats)
        cells.append({"lat": la, "lon": lo, "p": pred["probability"]})

    return jsonify({"count": len(cells), "items": cells})
