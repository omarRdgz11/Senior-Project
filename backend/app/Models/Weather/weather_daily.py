from app.extensions import db

class WeatherDaily(db.Model):
    __tablename__ = "weather_daily"
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    tempmax = db.Column(db.Float)
    tempmin = db.Column(db.Float)
    precip  = db.Column(db.Float)
    humidity = db.Column(db.Float)
    wind = db.Column(db.Float)