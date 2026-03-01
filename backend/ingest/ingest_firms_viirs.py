import csv
from datetime import datetime
from app import create_app
from app.extensions import db
from app.Models.Fire.firms_viirs import FirmsVIIRS

BATCH_SIZE = 1000


def parse_float(value):
    if value is None or value == "" or value.lower() == "null":
        return None
    return float(value)

def parse_confidence(value):
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in {"", "null", "nan", "none"}:
        return None
    # letter-based confidence
    if s in {"l", "n", "h"}:
        return {"l": 0.25, "n": 0.50, "h": 0.90}[s]
    # numeric confidence
    try:
        return float(s)
    except ValueError:
        return None

def ingest_csv(file_path):
    app = create_app()
    
    with app.app_context():
        count = 0
        batch = []

        with open(file_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                try:
                    record = FirmsVIIRS(
                        acq_date=datetime.strptime(row["acq_date"], "%Y-%m-%d").date(),
                        acq_time=row["acq_time"].zfill(4),
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"]),
                        confidence=parse_confidence(row.get("confidence")),
                        satellite=row.get("satellite"),
                        instrument=row.get("instrument"),
                        daynight=row.get("daynight"),
                    )

                    batch.append(record)
                    count += 1

                    if len(batch) >= BATCH_SIZE:
                        db.session.bulk_save_objects(batch)
                        db.session.commit()
                        batch.clear()
                        print(f"Inserted {count} records...")

                except Exception as e:
                    print(f"Skipping row due to error: {e}")
                    continue

        # Final batch
        if batch:
            db.session.bulk_save_objects(batch)
            db.session.commit()

        print(f"✅ Finished ingestion. Total inserted: {count}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python ingest_firms_viirs.py <path_to_csv>")
        sys.exit(1)

    ingest_csv(sys.argv[1])