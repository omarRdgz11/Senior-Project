# backend/app/Routes/Predictions/evacuation.py
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
EVACUATION_THRESHOLD = 0.40
SAFE_THRESHOLD = 0.25
SEARCH_DISTANCES = [5, 10, 15, 20, 30, 40, 50]
MILES_PER_DEG_LAT = 69.0

DIRECTIONS = {
    "North":     (1, 0),
    "Northeast": (1, 1),
    "East":      (0, 1),
    "Southeast": (-1, 1),
    "South":     (-1, 0),
    "Southwest": (-1, -1),
    "West":      (0, -1),
    "Northwest": (1, -1),
}


def score_location(lat: float, lng: float) -> float:
    """Run your existing ML pipeline on any coordinate."""
    today = date.today().isoformat()
    try:
        feats, _ = derive_features_level2(lat, lng, today, radius_km=25)
        result = predict_from_features(feats)
        prob = float(result["probability"])

        if prob != prob:  # NaN check
            logger.warning("score_location returned NaN; defaulting to 0.0 | lat=%s lng=%s", lat, lng)
            return 0.0

        clipped = max(0.0, min(1.0, prob))
        logger.info("score_location success | lat=%s lng=%s prob=%s clipped=%s", lat, lng, prob, clipped)
        return clipped

    except Exception as e:
        logger.exception("score_location failed | lat=%s lng=%s err=%s", lat, lng, e)
        return 0.0


def find_safe_zone(lat: float, lng: float) -> dict:
    """
    Search outward in 8 directions at increasing distances.
    Return the first candidate whose risk score is below SAFE_THRESHOLD.
    If none are below the threshold, return the lowest-risk candidate found.
    """
    logger.info("find_safe_zone start | origin=(%s,%s)", lat, lng)
    cos_lat = math.cos(math.radians(lat))
    best = None  # (risk, direction, c_lat, c_lng, distance_miles)

    for distance_miles in SEARCH_DISTANCES:
        logger.info("find_safe_zone checking distance=%s miles", distance_miles)
        candidates = []

        for direction, (dlat, dlng) in DIRECTIONS.items():
            norm = math.sqrt(dlat**2 + dlng**2) or 1.0
            c_lat = lat + (dlat / norm) * (distance_miles / MILES_PER_DEG_LAT)
            c_lng = lng + (dlng / norm) * (distance_miles / (MILES_PER_DEG_LAT * cos_lat))
            candidates.append((direction, c_lat, c_lng))

        for direction, c_lat, c_lng in candidates:
            risk = score_location(c_lat, c_lng)
            logger.info(
                "safe-zone candidate | direction=%s distance=%s candidate=(%s,%s) risk=%s",
                direction, distance_miles, c_lat, c_lng, risk
            )

            if best is None or risk < best[0]:
                best = (risk, direction, c_lat, c_lng, distance_miles)

            if risk < SAFE_THRESHOLD:
                logger.info(
                    "safe-zone selected (meets threshold) | direction=%s distance=%s risk=%s",
                    direction, distance_miles, risk
                )
                return {
                    "latitude": round(c_lat, 4),
                    "longitude": round(c_lng, 4),
                    "direction": direction,
                    "distance_miles": distance_miles,
                    "risk_level": risk,
                    "note": "meets_threshold"
                }

    if best is not None:
        risk, direction, c_lat, c_lng, distance_miles = best
        logger.warning(
            "safe-zone fallback (best available) | direction=%s distance=%s risk=%s",
            direction, distance_miles, risk
        )
        return {
            "latitude": round(c_lat, 4),
            "longitude": round(c_lng, 4),
            "direction": direction,
            "distance_miles": distance_miles,
            "risk_level": risk,
            "note": "best_available"
        }

    raise Exception("find_safe_zone reached end unexpectedly")


def get_route_to_direction(lat: float, lng: float, distances_miles: tuple, risk_level: float = 0.10):
    """
    Try all 8 directions at given distances until one routes successfully.
    Returns (safe_zone, route) or None if all fail.
    """
    logger.info("get_route_to_direction start | origin=(%s,%s) distances=%s", lat, lng, distances_miles)
    cos_lat = math.cos(math.radians(lat))

    for distance_miles in distances_miles:
        for direction, (dlat, dlng) in DIRECTIONS.items():
            norm = math.sqrt(dlat**2 + dlng**2) or 1.0
            dest_lat = lat + (dlat / norm) * (distance_miles / MILES_PER_DEG_LAT)
            dest_lng = lng + (dlng / norm) * (distance_miles / (MILES_PER_DEG_LAT * cos_lat))

            candidate = {
                "latitude": dest_lat,
                "longitude": dest_lng,
                "direction": direction,
                "distance_miles": distance_miles,
                "risk_level": risk_level,
            }

            logger.info(
                "route-direction candidate | direction=%s distance=%s candidate=(%s,%s)",
                direction, distance_miles, dest_lat, dest_lng
            )

            try:
                route = get_driving_route(lat, lng, candidate["latitude"], candidate["longitude"])
                candidate["distance_miles"] = round(route["distance_miles"], 1)

                logger.info(
                    "route-direction success | direction=%s route_distance=%s route_duration=%s geometry=%s",
                    direction,
                    route.get("distance_miles"),
                    route.get("duration_minutes"),
                    bool(route.get("geometry"))
                )
                return candidate, route

            except Exception as e:
                logger.warning(
                    "route-direction failed | direction=%s distance=%s err=%s",
                    direction, distance_miles, e
                )
                continue

    logger.error("get_route_to_direction exhausted all candidates with no route")
    return None


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R_KM = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    km = 2 * R_KM * math.asin(math.sqrt(a))
    return km / 1.60934


def _fallback_straight_line_route(origin_lat, origin_lng, dest_lat, dest_lng) -> dict:
    distance_miles = _haversine_miles(origin_lat, origin_lng, dest_lat, dest_lng)
    avg_speed_mph = 45.0
    duration_minutes = (distance_miles / avg_speed_mph) * 60.0

    logger.warning(
        "using straight-line fallback | origin=(%s,%s) dest=(%s,%s) distance=%s duration=%s",
        origin_lat, origin_lng, dest_lat, dest_lng, distance_miles, duration_minutes
    )

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
    """Call OpenRouteService and return GeoJSON geometry + summary."""
    logger.info(
        "get_driving_route start | origin=(%s,%s) dest=(%s,%s) ors_key_present=%s",
        origin_lat, origin_lng, dest_lat, dest_lng, bool(ORS_API_KEY and ORS_API_KEY.strip())
    )

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

    logger.info("ORS request payload | %s", payload)

    response = requests.post(
        url,
        json=payload,
        headers={"Authorization": ORS_API_KEY.strip()},
        timeout=15
    )

    logger.info("ORS response status=%s", response.status_code)

    if response.status_code != 200:
        txt = response.text or ""
        msg = ""

        try:
            j = response.json()
            if isinstance(j, dict) and isinstance(j.get("error"), dict):
                msg = j["error"].get("message", "") or ""
        except Exception:
            pass

        logger.warning("ORS error message=%s", msg[:300])
        logger.warning("ORS error text=%s", txt[:300])

        combined = (msg + " " + txt)

        if "Could not find routable point" in combined:
            logger.warning("ORS off-road fallback triggered")
            return _fallback_straight_line_route(origin_lat, origin_lng, dest_lat, dest_lng)


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

    route = {
        "geometry": geometry,
        "distance_miles": dist_m / 1609.34,
        "duration_minutes": dur_s / 60
    }

    logger.info(
        "get_driving_route success | distance_miles=%s duration_minutes=%s geometry=%s",
        route["distance_miles"],
        route["duration_minutes"],
        bool(route["geometry"])
    )

    return route


@bp_evacuation.route("/evacuation-route", methods=["POST"])
def evacuation_route():
    try:
        logger.info("===== EVACUATION ROUTE CALLED =====")
        logger.info("Headers: %s", dict(request.headers))
        logger.info("Raw body: %s", request.data)

        body = request.get_json(silent=True)
        logger.info("Parsed body: %s", body)

        if not body or "lat" not in body or "lng" not in body:
            logger.warning("Missing lat/lng in request body")
            return jsonify({"error": "lat and lng are required"}), 400

        try:
            lat = float(body["lat"])
            lng = float(body["lng"])
        except (TypeError, ValueError) as e:
            logger.warning("Invalid coordinates | err=%s body=%s", e, body)
            return jsonify({"error": f"Invalid lat/lng: {e}"}), 400

        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            logger.warning("Coordinates out of range | lat=%s lng=%s", lat, lng)
            return jsonify({"error": "Coordinates out of valid range"}), 400

        demo_mode = body.get("demo") in (True, "true", 1, "1")
        logger.info("Request values | lat=%s lng=%s demo_mode=%s", lat, lng, demo_mode)

        current_risk = score_location(lat, lng)
        logger.info("Model risk before override=%s", current_risk)

        if demo_mode:
            current_risk = 0.65
            logger.info("Demo override applied | current_risk=%s", current_risk)

        logger.info(
            "Threshold comparison | current_risk=%s threshold=%s evacuate=%s",
            current_risk,
            EVACUATION_THRESHOLD,
            current_risk >= EVACUATION_THRESHOLD
        )

        if current_risk < EVACUATION_THRESHOLD:
            logger.info("LOW RISK branch returning no evacuation")
            return jsonify({
                "should_evacuate": False,
                "current_risk": current_risk,
                "safe_zone": None,
                "route": None,
                "message": "Your area is currently at low fire risk. No evacuation needed."
            })

        logger.info("HIGH RISK branch entered")

        safe_zone = None
        route = None

        if demo_mode:
            logger.info("Demo mode routing path")
            result = get_route_to_direction(lat, lng, (0.5, 1, 2, 3, 5), risk_level=0.10)
            if result:
                safe_zone, route = result
                logger.info("Demo route result success | safe_zone=%s", safe_zone)
            else:
                logger.warning("Demo route result returned None")
        else:
            logger.info("Production/non-demo ML safe-zone path")
            try:
                safe_zone = find_safe_zone(lat, lng)
                logger.info("find_safe_zone returned | %s", safe_zone)

                try:
                    route = get_driving_route(lat, lng, safe_zone["latitude"], safe_zone["longitude"])
                    logger.info(
                        "Direct route success | distance=%s duration=%s geometry=%s",
                        route.get("distance_miles"),
                        route.get("duration_minutes"),
                        bool(route.get("geometry"))
                    )
                except Exception as e:
                    logger.warning("Direct route failed; trying directional fallback | err=%s", e)
                    result = get_route_to_direction(lat, lng, SEARCH_DISTANCES, risk_level=safe_zone["risk_level"])
                    if result:
                        safe_zone, route = result
                        logger.info("Directional fallback success | safe_zone=%s", safe_zone)
                    else:
                        logger.warning("Directional fallback returned None")

            except Exception as e:
                logger.warning("find_safe_zone failed; trying directional fallback | err=%s", e)
                result = get_route_to_direction(lat, lng, SEARCH_DISTANCES, risk_level=0.20)
                if result:
                    safe_zone, route = result
                    logger.info("Emergency fallback success | safe_zone=%s", safe_zone)
                else:
                    logger.warning("Emergency fallback returned None")

        if not safe_zone or not route:
            logger.error("No safe_zone/route found | safe_zone=%s route=%s", safe_zone, route)
            return jsonify({
                "error": "Could not find a routable evacuation route from your location. Try a different area or check back later."
            }), 500

        logger.info(
            "Returning evacuation success | risk=%s safe_zone=%s route_distance=%s route_duration=%s",
            current_risk,
            safe_zone,
            route.get("distance_miles"),
            route.get("duration_minutes")
        )

        return jsonify({
            "should_evacuate": True,
            "current_risk": current_risk,
            "safe_zone": safe_zone,
            "route": route
        })

    except Exception as e:
        logger.exception("Evacuation route unhandled error | err=%s", e)
        return jsonify({"error": str(e)}), 500