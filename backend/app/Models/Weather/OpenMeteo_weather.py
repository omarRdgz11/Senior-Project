# backend/app/Models/Weather/OpenMeteo_weather.py
from app.extensions import db

class OpenMeteoWeather(db.Model):
    __tablename__ = "openmeteo_weather"
    datetime = db.Column(db.Date, primary_key=True, nullable=False)
    tempmax = db.Column(db.Float)
    tempmin = db.Column(db.Float)
    humidity = db.Column(db.Float)
    windspeed = db.Column(db.Float)
    precip  = db.Column(db.Float)