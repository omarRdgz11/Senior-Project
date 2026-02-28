import os
import logging
from flask import Blueprint, request, jsonify
from datetime import date
import math

from app.services.features import derive_features_level2
from app.model.infer import predict_from_features
import requests

logger = logging.getLogger(__name__)

bp_evacuation = Blueprint(
    "evacuation",
    __name__,
    url_prefix="/api"
)

# --- Config ---
ORS_API_KEY = os.getenv("ORS_API_KEY", "")
EVACUATION_THRESHOLD = 0.40   # risk score that triggers evacuation
SAFE_THRESHOLD       = 0.25   # risk score that counts as "safe zone"
SEARCH_DISTANCES = [5, 10, 15, 20, 30, 40, 50] # miles to search outward
MILES_PER_DEG_LAT    = 69.0

DIRECTIONS = {
    "North":     ( 1,  0),
    "Northeast": ( 1,  1),
    "East":      ( 0,  1),
    "Southeast": (-1,  1),
    "South":     (-1,  0),
    "Southwest": (-1, -1),
    "West":      ( 0, -1),
    "Northwest": ( 1, -1),
}


def score_location(lat: float, lng: float) -> float:
    """Run your existing ML pipeline on any coordinate."""
    today = date.today().isoformat()
    try:
        feats, _ = derive_features_level2(lat, lng, today, radius_km=25)
        result = predict_from_features(feats)
        prob = float(result["probability"])
        # Guard against NaN from model (e.g. missing/invalid features)
        if prob != prob:  # NaN check
            return 0.0
        return max(0.0, min(1.0, prob))
    except Exception:
        return 0.0  # if data is unavailable for that coord, treat as safe


def find_safe_zone(lat: float, lng: float) -> dict:
    """
    Search outward in 8 directions at increasing distances.
    Return the first candidate whose risk score is below SAFE_THRESHOLD.
    If none are below the threshold, return the lowest-risk candidate found ("best available")
    so the system doesn't fail hard.
    """
    print("✅ NEW find_safe_zone() RUNNING (best_available enabled)")
    cos_lat = math.cos(math.radians(lat))

    best = None  # (risk, direction, c_lat, c_lng, distance_miles)

    for distance_miles in SEARCH_DISTANCES:
        candidates = []
        for direction, (dlat, dlng) in DIRECTIONS.items():
            norm = math.sqrt(dlat**2 + dlng**2) or 1.0
            c_lat = lat + (dlat / norm) * (distance_miles / MILES_PER_DEG_LAT)
            c_lng = lng + (dlng / norm) * (distance_miles / (MILES_PER_DEG_LAT * cos_lat))

            # keep full precision for scoring/routing (round later for display)
            candidates.append((direction, c_lat, c_lng))

        for direction, c_lat, c_lng in candidates:
            risk = score_location(c_lat, c_lng)

            # track best candidate seen so far
            if best is None or risk < best[0]:
                best = (risk, direction, c_lat, c_lng, distance_miles)

            # ideal case: found a "safe" candidate
            if risk < SAFE_THRESHOLD:
                return {
                    "latitude": round(c_lat, 4),
                    "longitude": round(c_lng, 4),
                    "direction": direction,
                    "distance_miles": distance_miles,
                    "risk_level": risk,
                    "note": "meets_threshold"
                }

    # If none meet threshold, return best available instead of crashing
    if best is not None:
        risk, direction, c_lat, c_lng, distance_miles = best
        return {
            "latitude": round(c_lat, 4),
            "longitude": round(c_lng, 4),
            "direction": direction,
            "distance_miles": distance_miles,
            "risk_level": risk,
            "note": "best_available"
        }

    # Should never happen, but keeps function total
    raise Exception("DEBUG: find_safe_zone reached end (should not happen)")

def get_route_to_direction(lat: float, lng: float, distances_miles: tuple, risk_level: float = 0.10) -> tuple[dict, dict] | None:
    """
    Try all 8 directions at given distances until one routes successfully.
    Returns (safe_zone, route) or None if all fail. Use for demo and fallback when points may be off-road.
    """
    cos_lat = math.cos(math.radians(lat))
    for distance_miles in distances_miles:
        for direction, (dlat, dlng) in DIRECTIONS.items():
            norm = math.sqrt(dlat**2 + dlng**2) or 1.0
            dest_lat = lat + (dlat / norm) * (distance_miles / MILES_PER_DEG_LAT)
            dest_lng = lng + (dlng / norm) * (distance_miles / (MILES_PER_DEG_LAT * cos_lat))
            candidate = {
                "latitude": dest_lat,
                "longitude": dest_lng,  # no rounding for ORS routing
                "direction": direction,
                "distance_miles": distance_miles,
                "risk_level": risk_level,
            }
            try:
                route = get_driving_route(lat, lng, candidate["latitude"], candidate["longitude"])
                candidate["distance_miles"] = round(route["distance_miles"], 1)
                return candidate, route
            except Exception:
                continue
    return None
# --- Routing helpers ---

def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Straight-line distance in miles between two points."""
    R_KM = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    km = 2 * R_KM * math.asin(math.sqrt(a))
    return km / 1.60934


def _fallback_straight_line_route(origin_lat, origin_lng, dest_lat, dest_lng) -> dict:
    """Return synthetic straight-line route when ORS can't find a road nearby."""
    distance_miles = _haversine_miles(origin_lat, origin_lng, dest_lat, dest_lng)
    avg_speed_mph = 45.0
    duration_minutes = (distance_miles / avg_speed_mph) * 60.0
    return {
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [origin_lng, origin_lat],
                [dest_lng, dest_lat],
            ],
        },
        "distance_miles": round(distance_miles, 1),
        "duration_minutes": round(duration_minutes, 1),
    }


def get_driving_route(origin_lat, origin_lng, dest_lat, dest_lng) -> dict:
    """Call OpenRouteService and return GeoJSON geometry + summary. Falls back to straight line if ORS can't route."""
    print("✅ get_driving_route() WITH STRAIGHT-LINE FALLBACK RUNNING")

    if not ORS_API_KEY or not ORS_API_KEY.strip():
        raise Exception("OpenRouteService API key is not configured. Set ORS_API_KEY in your environment.")

    url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    payload = {
        "coordinates": [
            [origin_lng, origin_lat],
            [dest_lng, dest_lat],
        ],
        "radiuses": [5000, 5000],
    }

    response = requests.post(
        url,
        json=payload,
        headers={"Authorization": ORS_API_KEY.strip()},
        timeout=15
    )

    if response.status_code != 200:
        txt = response.text or ""

        # Try to extract ORS JSON error message (ORS often puts it here)
        msg = ""
        try:
            j = response.json()
            if isinstance(j, dict) and isinstance(j.get("error"), dict):
                msg = j["error"].get("message", "") or ""
        except Exception:
            pass

        combined = (msg + " " + txt)

        # Debug: show what ORS actually returned (first 300 chars)
        print("ORS status:", response.status_code)
        print("ORS error msg:", msg[:300])
        print("ORS error text:", txt[:300])

        # ORS can't find a road nearby — fallback to straight line
        if "Could not find routable point" in combined:
            logger.info(
                "ORS off-road fallback: using straight-line route for (%.4f,%.4f) -> (%.4f,%.4f)",
                origin_lat, origin_lng, dest_lat, dest_lng
            )
            return _fallback_straight_line_route(origin_lat, origin_lng, dest_lat, dest_lng)

        # Everything else: raise the real ORS error
        raise Exception(f"Routing API error ({response.status_code}): {(msg or txt)[:500]}")

    data = response.json()
    features = data.get("features") or []
    if not features:
        err = data.get("error", {})
        err_msg = err.get("message", "No route found") if isinstance(err, dict) else str(data)
        raise Exception(f"No route returned: {err_msg[:300]}")

    feature = features[0]
    props = feature.get("properties") or {}
    summary = props.get("summary") or {}
    geometry = feature.get("geometry")

    if not geometry:
        raise Exception("Route geometry missing from API response")

    dist_m = summary.get("distance") or 0
    dur_s = summary.get("duration") or 0

    return {
        "geometry": geometry,
        "distance_miles": dist_m / 1609.34,
        "duration_minutes": dur_s / 60
    }


# --- Main endpoint ---

# @bp_evacuation.route("/evacuation-route", methods=["POST"])
# def evacuation_route():
#     """
#     POST /api/evacuation-route
#     Body: { "lat": float, "lng": float, "demo"?: bool }
#     When demo=true, forces evacuation scenario for demos (uses simulated high risk).
#     Returns EvacuationData matching your frontend interface exactly.
#     """
#     try:
#         body = request.get_json()
#         if not body or "lat" not in body or "lng" not in body:
#             return jsonify({"error": "lat and lng are required"}), 400

#         try:
#             lat = float(body["lat"])
#             lng = float(body["lng"])
#         except (TypeError, ValueError) as e:
#             return jsonify({"error": f"Invalid lat/lng: {e}"}), 400

#         if not (-90 <= lat <= 90 and -180 <= lng <= 180):
#             return jsonify({"error": "Coordinates out of valid range"}), 400

#         demo_mode = body.get("demo") is True

#         # Step 1: Score the user's current location (or use simulated risk in demo mode)
#         current_risk = score_location(lat, lng)
#         if demo_mode:
#             current_risk = 0.65  # Simulated high risk for demo

#         if current_risk < EVACUATION_THRESHOLD:
#             return jsonify({
#                 "should_evacuate": False,
#                 "current_risk":    current_risk,
#                 "safe_zone":       None,
#                 "route":           None,
#                 "message":         "Your area is currently at low fire risk. No evacuation needed."
#             })

#         # Step 2: Find nearest safe zone
#         try:
#             safe_zone = find_safe_zone(lat, lng)
#         except Exception as e:
#             logger.warning("find_safe_zone failed: %s", e)
#             return jsonify({"error": str(e)}), 500

#         # Step 3: Get driving route to safe zone
#         try:
#             route = get_driving_route(lat, lng, safe_zone["latitude"], safe_zone["longitude"])
#         except Exception as e:
#             logger.warning("get_driving_route failed: %s", e)
#             return jsonify({"error": f"Routing failed: {str(e)}"}), 500

#         return jsonify({
#             "should_evacuate": True,
#             "current_risk":    current_risk,
#             "safe_zone":       safe_zone,
#             "route":           route
#         })

@bp_evacuation.route("/evacuation-route", methods=["POST"])
def evacuation_route():
    try:
        print("✅ EVACUATION ROUTE v2 (fallback enabled) LOADED")
        print("\n===== EVACUATION ROUTE CALLED =====")

        body = request.get_json()
        print("Incoming body:", body)

        if not body or "lat" not in body or "lng" not in body:
            print("Missing lat/lng")
            return jsonify({"error": "lat and lng are required"}), 400

        try:
            lat = float(body["lat"])
            lng = float(body["lng"])
        except (TypeError, ValueError) as e:
            print("Invalid coordinates:", e)
            return jsonify({"error": f"Invalid lat/lng: {e}"}), 400

        demo_mode = body.get("demo") in (True, "true", 1, "1")
        print("Demo mode received:", demo_mode)

        current_risk = score_location(lat, lng)
        print("Model risk BEFORE demo override:", current_risk)

        if demo_mode:
            current_risk = 0.65
            print("Demo override applied. Risk now:", current_risk)

        print("Evacuation threshold:", EVACUATION_THRESHOLD)

        if current_risk < EVACUATION_THRESHOLD:
            print("✅ BELOW threshold — NOT evacuating")
            return jsonify({
                "should_evacuate": False,
                "current_risk":    current_risk,
                "safe_zone":       None,
                "route":           None,
                "message":         "Your area is currently at low fire risk. No evacuation needed."
            })

        print("ABOVE threshold — evacuation triggered")

        # Step 2: Find safe zone + route
        safe_zone = None
        route = None

        if demo_mode:
            # Demo: use very short distances (0.5–5 mi) — points close to user are almost always routable
            result = get_route_to_direction(lat, lng, (0.5, 1, 2, 3, 5), risk_level=0.10)
            if result:
                safe_zone, route = result
        else:
            # Non-demo: try ML-based safe zone first, then route
            try:
                safe_zone = find_safe_zone(lat, lng)
                try:
                    route = get_driving_route(lat, lng, safe_zone["latitude"], safe_zone["longitude"])
                except Exception:
                    # ML point may be off-road; try direction-based routing as fallback
                    result = get_route_to_direction(lat, lng, SEARCH_DISTANCES, risk_level=safe_zone["risk_level"])
                    if result:
                        safe_zone, route = result
            except Exception:
                # No ML safe zone; try direction-based routing (best-effort evacuation)
                result = get_route_to_direction(lat, lng, SEARCH_DISTANCES, risk_level=0.20)
                if result:
                    safe_zone, route = result

        if not safe_zone or not route:
            return jsonify({
                "error": "Could not find a routable evacuation route from your location. Try a different area or check back later."
            }), 500

        return jsonify({
            "should_evacuate": True,
            "current_risk":    current_risk,
            "safe_zone":       safe_zone,
            "route":           route
        })

    except Exception as e:
        logger.exception("Evacuation route unhandled error")
        return jsonify({"error": str(e)}), 500