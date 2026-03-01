# backend/app/Models/Fire/travis_fires_daily.py
from app.extensions import db

class TravisFiresDaily(db.Model):
    __tablename__ = "travis_fires_daily"

    acq_date = db.Column(db.Date, primary_key=True, nullable=False)
    fire_count = db.Column(db.Integer, nullable=False)
    avg_brightness = db.Column(db.Float)
    avg_confidence = db.Column(db.Float)
    avg_frp = db.Column(db.Float)
    label = db.Column(db.Integer)


