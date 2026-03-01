# backend/app/Models/Weather/weather_daily_regional.py
from app.extensions import db


class WeatherDailyRegional(db.Model):
    __tablename__ = "weather_daily_regional"

    id = db.Column(db.Integer, primary_key=True)
    region_id = db.Column(db.Integer, db.ForeignKey("regions.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    tempmax = db.Column(db.Float)
    tempmin = db.Column(db.Float)
    humidity = db.Column(db.Float)
    windspeed = db.Column(db.Float)
    precip = db.Column(db.Float)

    # Relationships
    region = db.relationship("Region", backref="weather_daily")

    # Ensure uniqueness per region per date
    __table_args__ = (
        db.UniqueConstraint("region_id", "date", name="uq_weather_daily_regional_region_date"),
    )
