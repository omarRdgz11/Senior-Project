from app.extensions import db
from datetime import datetime


class TwilioSubscription(db.Model):
    __tablename__ = "twilio_subscription"

    id = db.Column(db.Integer, primary_key=True)

    phone_number = db.Column(db.String(20), nullable=False, unique=True)

    zip_code = db.Column(db.String(10), nullable=False)

    alerts_enabled = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<TwilioSubscription {self.phone_number} {self.zip_code}>"