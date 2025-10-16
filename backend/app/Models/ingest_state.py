from app.extensions import db

class IngestState(db.Model):
    __tablename__ = "ingest_state"
    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.String(64), nullable=False)       # e.g., "VIIRS_NOAA20_NRT"
    bbox = db.Column(db.String(64), nullable=False)             # "-98.20,30.00,-97.20,30.70"
    last_acq_ts_utc = db.Column(db.DateTime(timezone=True))     # latest acq_ts_utc we saved

    __table_args__ = (
        db.UniqueConstraint("source_id", "bbox", name="uq_ingest_source_bbox"),
    )
