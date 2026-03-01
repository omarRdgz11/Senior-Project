from flask import Blueprint, request, jsonify
from datetime import datetime

from app.extensions import db
from app.Models.subscriptions import TwilioSubscription
from app.services.twilio_services import send_sms
from app.services.improved_prediction import predict_daily_fire_risk

notifications_bp = Blueprint(
    "notifications",
    __name__,
    url_prefix="/api/notifications"
)


@notifications_bp.route("/send-daily-alerts", methods=["GET"])
def send_daily_alerts():
    """
    GET /api/notifications/send-daily-alerts?date=YYYY-MM-DD

    Runs prediction and sends SMS alerts if fire probability exceeds threshold.
    """

    date_str = request.args.get("date")

    if not date_str:
        return jsonify({"error": "date query param required"}), 400


    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "invalid date format"}), 400


    try:

        # Get fire prediction
        result = predict_daily_fire_risk(target_date)

        fire_probability = result.get("fire_probability", 0)
        label = result.get("label", "Unknown")


        THRESHOLD = 0.70

        if fire_probability < THRESHOLD:

            return jsonify({
                "message": "Fire probability below threshold",
                "fire_probability": fire_probability,
                "alerts_sent": 0
            })


        # Get all subscribed users
        users = TwilioSubscription.query.filter_by(
            alerts_enabled=True
        ).all()


        sent_users = []


        for user in users:

            message = f"""
🔥 Wildfire Alert

Date: {target_date}

Risk Level: {label}
Probability: {fire_probability:.2%}

Stay alert and monitor local emergency services.
"""

            send_sms(user.phone_number, message)

            sent_users.append(user.phone_number)


        return jsonify({

            "message": "Alerts sent successfully",

            "date": date_str,

            "fire_probability": fire_probability,

            "total_alerts_sent": len(sent_users),

            "users": sent_users

        })


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

@notifications_bp.route("/test", methods=["POST"])
def test_sms():

    data = request.get_json()

    phone = data.get("phone_number")

    if not phone:
        return jsonify({"error": "phone_number required"}), 400


    send_sms(phone, "Test message from WildSight 🔥")

    return jsonify({"message": "Test SMS sent"})