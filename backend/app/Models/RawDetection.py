from sqlalchemy import func
from app.extensions import db
from geoalchemy2 import Geometry

class RawDetection(db.Model):
    __tablename__ = "raw_detections"

    id = db.Column(db.Integer, primary_key=True)

    # latitude / longitude → where the hotspot is (center of the 375 m pixel).

    latitude = db.Column(db.Float, nullable = False)
    longitude = db.Column(db.Float, nullable = False)

    # bright_ti4 / bright_ti5 → brightness temps in thermal IR bands (used to detect fire).
    bright_ti4 = db.Column(db.Float, nullable = False)  

    # acq_date / acq_time → when the detection happened (UTC).

    acq_date = db.Column(db.Date, nullable = False)

    acq_time = db.Column(db.Time, nullable = False)
    # satellite → N = Suomi NPP, J = NOAA-20, N21 = NOAA-21.

    satellite = db.Column(db.String(5), nullable = False)

    # confidence → NASA’s QA flag: low, nominal, high.

    confidence = db.Column(db.String(30), nullable = False)

    # frp → Fire Radiative Power (MW), proxy for fire intensity.
    frp = db.Column(db.Float, nullable = False)

    # daynight → D or N (day vs night pass).

    daynight = db.Column(db.String(1), nullable = False)

        # ADDED THESE COLUMNS SO THAT WE CAN TRACK SPATIAL DATA
    
    # combined UTC timestamp
    acq_ts_utc = db.Column(db.DateTime(timezone=True))    
    # default to acq_date + acq_time  
    source_id = db.Column(db.String(20))    
    # satellite processing level: NRT, SP               
    processing_level = db.Column(db.String(5))  
     # PostGIS geometry          
    geom = db.Column(Geometry(geometry_type='POINT', srid=4326)) 


    
    __table_args__ = (
        # <- “dedupe key”: treat same place+time+satellite as the same detection
        db.UniqueConstraint(
            "acq_date", "acq_time", "latitude", "longitude", "satellite",
            name="uq_raw_spacetime_sat",
        ),
        # helpful query indexes
        db.Index("ix_raw_date_time", "acq_date", "acq_time"),
        db.Index("ix_raw_lat_lon", "latitude", "longitude"),
    )
    

