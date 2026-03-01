# backend/app/Models/Region.py
from app.extensions import db


class Region(db.Model):
    __tablename__ = "regions"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    center_lat = db.Column(db.Float, nullable=False)
    center_lon = db.Column(db.Float, nullable=False)
    bbox_w = db.Column(db.Float, nullable=False)  # west (min longitude)
    bbox_s = db.Column(db.Float, nullable=False)  # south (min latitude)
    bbox_e = db.Column(db.Float, nullable=False)  # east (max longitude)
    bbox_n = db.Column(db.Float, nullable=False)  # north (max latitude)

    def bbox_string(self):
        """Return bbox in FIRMS API format: 'west,south,east,north'"""
        return f"{self.bbox_w},{self.bbox_s},{self.bbox_e},{self.bbox_n}"
