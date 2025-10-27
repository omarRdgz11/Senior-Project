# backend/app/ingest_weather_daily.py
import csv, datetime, os, re
from typing import Optional, Dict
from app.extensions import db
from app import app
from app.Models.weather_daily import WeatherDaily

CSV_PATH = "/app/data/30.30,-97.75 2023-01-01 to 2023-12-31.csv"

# ---------- helpers ----------
def _try_float(x):
    try:
        s = ("" if x is None else str(x)).strip()
        if s.lower() in ("", "na", "nan", "null", "none"): return None
        return float(s)
    except Exception:
        return None

def _parse_date(s: str) -> datetime.date:
    s = s.strip()
    # Common formats: 2023-01-01 ; 01/01/2023 ; 2023-01-01T00:00:00Z
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    # ISO-like with time
    try:
        return datetime.datetime.fromisoformat(s.replace("Z","").replace("T", " ")).date()
    except Exception:
        pass
    # Last resort: split on space and hyphen
    m = re.match(r"(\d{4}-\d{2}-\d{2})", s)
    if m:
        return datetime.date.fromisoformat(m.group(1))
    raise ValueError(f"unrecognized date format: {s}")

def _latlon_from_filename(path: str):
    # e.g., "30.30,-97.75 2023-01-01 to 2023-12-31.csv"
    fname = os.path.basename(path)
    m = re.search(r'([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)', fname)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None, None

def _find_col(header_map: Dict[str, str], candidates):
    """header_map: {lower_header: original_header}, candidates: list of lower-case options"""
    for c in candidates:
        if c in header_map:
            return header_map[c]
    return None

# ---------- main ingest ----------
with app.app_context():
    # Read header first to build a case-insensitive mapping
    with open(CSV_PATH, newline="") as f:
        rdr = csv.reader(f)
        headers = next(rdr)
    lower_to_orig = {h.strip().lower(): h for h in headers}

    # Detect key columns
    date_col = _find_col(lower_to_orig, ["date", "datetime", "valid", "time", "day"])
    lat_col  = _find_col(lower_to_orig, ["latitude", "lat", "y"])
    lon_col  = _find_col(lower_to_orig, ["longitude", "lon", "x"])

    tempmax_col = _find_col(lower_to_orig, ["tempmax","tmax","maximum temperature","maxtemp","max_temp"])
    tempmin_col = _find_col(lower_to_orig, ["tempmin","tmin","minimum temperature","mintemp","min_temp"])
    precip_col  = _find_col(lower_to_orig, ["precip","prcp","precipitation","rain"])
    humidity_col= _find_col(lower_to_orig, ["humidity","rh","relativehumidity","relative_humidity"])
    wind_col    = _find_col(lower_to_orig, ["wind","windspeed","wind_speed","wspd"])

    # Fall back lat/lon from filename if not present per-row
    default_lat, default_lon = _latlon_from_filename(CSV_PATH)

    if not date_col:
        raise SystemExit("Could not find a date-like column. "
                         f"Headers seen: {headers}. Try renaming to include 'date' or 'datetime'.")

    print("Detected columns:",
          {"date": date_col, "lat": lat_col or default_lat, "lon": lon_col or default_lon,
           "tempmax": tempmax_col, "tempmin": tempmin_col, "precip": precip_col,
           "humidity": humidity_col, "wind": wind_col})

    rows, total, bad = [], 0, 0
    BATCH = 5000

    with open(CSV_PATH, newline="") as f:
        rdr = csv.DictReader(f)
        for i, row in enumerate(rdr, start=1):
            try:
                # date
                dt = _parse_date(row[date_col])

                # lat/lon (from row or filename)
                lat = _try_float(row[lat_col]) if lat_col else default_lat
                lon = _try_float(row[lon_col]) if lon_col else default_lon
                if lat is None or lon is None:
                    raise ValueError("missing lat/lon (not in file and not parseable from filename)")

                obj = WeatherDaily(
                    date=dt, latitude=float(lat), longitude=float(lon),
                    tempmax=_try_float(row.get(tempmax_col)) if tempmax_col else None,
                    tempmin=_try_float(row.get(tempmin_col)) if tempmin_col else None,
                    precip=_try_float(row.get(precip_col)) if precip_col else None,
                    humidity=_try_float(row.get(humidity_col)) if humidity_col else None,
                    wind=_try_float(row.get(wind_col)) if wind_col else None,
                )
                rows.append(obj)

                if len(rows) >= BATCH:
                    db.session.bulk_save_objects(rows)
                    db.session.commit()
                    total += len(rows); rows.clear()
                    print(f"Committed {total} rows…")

            except Exception as e:
                bad += 1
                if bad <= 10:  # show first few raw rows for debugging
                    print(f"Skip row {i} due to parse error: {e}. Raw: {row}")

    if rows:
        db.session.bulk_save_objects(rows)
        db.session.commit()
        total += len(rows)

    print(f"Loaded: {total}, Skipped: {bad}")
