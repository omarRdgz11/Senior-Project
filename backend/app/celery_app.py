# backend/app/celery_app.py

import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

# Broker and backend (these should already match your docker-compose)
BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://fire-redis:6379/0")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", BROKER_URL)

celery = Celery(
    "fires_app",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        "app.tasks.daily_ingest",  # our ingestion task module
    ],
)

# Optional: misc Celery config
celery.conf.timezone = "America/Chicago"

# Beat schedule: run once a day at 03:00
celery.conf.beat_schedule = {
    "daily-data-ingest": {
        "task": "app.tasks.daily_ingest.run_daily_ingest",
        "schedule": crontab(hour=3, minute=0),
    },
}
