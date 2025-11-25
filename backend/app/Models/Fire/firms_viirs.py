# backend/app/Models/firms_viirs.py
from app.extensions import db

class FirmsVIIRS(db.Model):
    __tablename__ = "firms_viirs"
    id = db.Column(db.Integer, primary_key=True)
    acq_date = db.Column(db.Date, nullable=False)
    acq_time = db.Column(db.String(4), nullable=False)  # "HHMM"
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    confidence = db.Column(db.Float)
    satellite = db.Column(db.String(8))
    instrument = db.Column(db.String(16))
    daynight = db.Column(db.String(1))

