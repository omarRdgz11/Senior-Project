# backend/app/ingest_firms_viirs.py
import csv, datetime, re
from app.extensions import db
from app import app
from app.Models.firms_viirs import FirmsVIIRS

CSV_PATH = "/app/data/viirs-snpp_2024_United_States.csv"

# If your file uses slightly different header names, adjust here:
COL = {
    "acq_date": "acq_date",       # e.g., 2024-07-15
    "acq_time": "acq_time",       # e.g., 1836 or "1836"
    "lat": "latitude",
    "lon": "longitude",
    "confidence": "confidence",   # VIIRS often: l / n / h  (low/nominal/high)
    "satellite": "satellite",     # e.g., SNPP
    "instrument": "instrument",   # e.g., VIIRS
    "daynight": "daynight",       # D / N
}

# --- Robust parsers ---------------------------------------------------------

def parse_date(s: str) -> datetime.date:
    s = s.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    # last resort: ISO-like
    return datetime.date.fromisoformat(s)

def parse_time_to_hhmm(s: str) -> str:
    # Keep digits only, pad left, clamp to 4 chars
    digits = re.sub(r"\D", "", (s or "").strip())
    return digits.zfill(4)[:4] if digits else "0000"

def parse_float_maybe(s):
    if s is None:
        return None
    s = str(s).strip().lower()
    if s in ("", "na", "nan", "null", "none"):
        return None
    try:
        return float(s)
    except Exception:
        return None

def parse_confidence_viirs(s):
    """
    VIIRS confidence is often categorical: l / n / h
    Map to numeric so the DB stays numeric. Tune as you like:
      l -> 0.2, n -> 0.5, h -> 0.9
    If it's already numeric, keep it.
    """
    if s is None:
        return None
    t = str(s).strip().lower()
    if t in ("l", "low"):
        return 0.2
    if t in ("n", "nominal", "m", "med", "medium"):
        return 0.5
    if t in ("h", "hi", "high"):
        return 0.9
    # Try numeric confidence if present in some feeds (e.g., 0–100)
    val = parse_float_maybe(t)
    if val is not None:
        # if it's 0–100, normalize to 0–1 (optional)
        return val/100.0 if val > 1.0 else val
    return None

# ---------------------------------------------------------------------------

def iter_rows(path):
    with open(path, newline="") as f:
        rdr = csv.DictReader(f)
        for i, row in enumerate(rdr, start=1):
            try:
                acq_date = parse_date(row[COL["acq_date"]])
                acq_time = parse_time_to_hhmm(row.get(COL["acq_time"]))
                lat = parse_float_maybe(row.get(COL["lat"]))
                lon = parse_float_maybe(row.get(COL["lon"]))
                if lat is None or lon is None:
                    raise ValueError("missing/invalid lat/lon")

                yield FirmsVIIRS(
                    acq_date=acq_date,
                    acq_time=acq_time,
                    latitude=lat,
                    longitude=lon,
                    confidence=parse_confidence_viirs(row.get(COL["confidence"])),
                    satellite=(row.get(COL["satellite"]) or "").strip() or None,
                    instrument=(row.get(COL["instrument"]) or "").strip() or None,
                    daynight=(row.get(COL["daynight"]) or "").strip()[:1] or None,
                )
            except Exception as e:
                # Log the first few problematic rows to help you tune the COL map or parsers
                if i <= 10:
                    print(f"Skip row {i} due to parse error: {e}. Raw row: {row}")
                else:
                    # keep logs short after first 10
                    if i % 1000 == 0:
                        print(f"Skipping rows… latest error at line {i}: {e}")

with app.app_context():
    batch, total = [], 0
    BATCH_SIZE = 5000
    for obj in iter_rows(CSV_PATH):
        batch.append(obj)
        if len(batch) >= BATCH_SIZE:
            db.session.bulk_save_objects(batch)
            db.session.commit()
            total += len(batch)
            print(f"Committed {total} rows…")
            batch.clear()

    if batch:
        db.session.bulk_save_objects(batch)
        db.session.commit()
        total += len(batch)

    print("Loaded total rows:", total)

