# backend/app/Models/Fire/fires_daily.py
from app.extensions import db


class FiresDaily(db.Model):
    __tablename__ = "fires_daily"

    id = db.Column(db.Integer, primary_key=True)
    region_id = db.Column(db.Integer, db.ForeignKey("regions.id"), nullable=False)
    acq_date = db.Column(db.Date, nullable=False)
    fire_count = db.Column(db.Integer, nullable=False)
    avg_brightness = db.Column(db.Float)
    avg_confidence = db.Column(db.Float)
    avg_frp = db.Column(db.Float)
    label = db.Column(db.Integer)

    # Relationships
    region = db.relationship("Region", backref="fires_daily")

    # Ensure uniqueness per region per date
    __table_args__ = (
        db.UniqueConstraint("region_id", "acq_date", name="uq_fires_daily_region_date"),
    )
