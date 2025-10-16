import os
from celery import Celery
from flask import Flask
from app import create_app  # your factory

def make_celery(flask_app: Flask) -> Celery:
    broker = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
    celery = Celery(flask_app.import_name, broker=broker, backend=backend)
    celery.conf.update(
        timezone="UTC",
        enable_utc=True,
        task_serializer="json",
        accept_content=["json"],
        beat_schedule={
            # run once daily at 06:15 UTC (adjust as needed)
            "daily-firms-fetch": {
                "task": "app.tasks.firms_fetch.daily_fetch_for_travis",
                "schedule": 24*60*60,   # simple 24h; swap for crontab if preferred
                "options": {"queue": "default"},
            }
        },
    )

    # allow tasks to use app context
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with flask_app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

flask_app = create_app()
celery = make_celery(flask_app)

