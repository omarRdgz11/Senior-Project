# backend/app/tasks/daily_ingest.py

from __future__ import annotations

import os
from datetime import date, datetime, timedelta
from typing import Optional, Tuple

from celery import shared_task
from sqlalchemy import func

from app import create_app
from app.extensions import db
from app.Models.Fire.travis_fires_daily import TravisFiresDaily
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from app.services.data_fetchers import (
    fetch_open_meteo_range,
    fetch_travis_fires_daily_range,
)


def _parse_data_start_date() -> date:
    raw = os.getenv("DATA_START_DATE", "2000-01-01")
    return datetime.strptime(raw, "%Y-%m-%d").date()


def _get_missing_range_for_openmeteo() -> Optional[Tuple[date, date]]:
    """Return (start, end) date for which we need to backfill OpenMeteoWeather."""
    last_date: Optional[date] = db.session.query(
        func.max(OpenMeteoWeather.datetime)
    ).scalar()

    if last_date is None:
        start = _parse_data_start_date()
    else:
        start = last_date + timedelta(days=1)

    # Use yesterday as upper bound so the day is "complete"
    target = date.today() - timedelta(days=1)
    if start > target:
        return None

    return start, target


def _get_missing_range_for_travis_fires() -> Optional[Tuple[date, date]]:
    """Return (start, end) date for which we need to backfill TravisFiresDaily."""
    last_date: Optional[date] = db.session.query(
        func.max(TravisFiresDaily.acq_date)
    ).scalar()

    if last_date is None:
        start = _parse_data_start_date()
    else:
        start = last_date + timedelta(days=1)

    target = date.today() - timedelta(days=1)
    if start > target:
        return None

    return start, target


def update_openmeteo_weather() -> None:
    """Fill in missing rows in openmeteo_weather using Open-Meteo API."""
    missing_range = _get_missing_range_for_openmeteo()
    if not missing_range:
        return

    start, end = missing_range
    df = fetch_open_meteo_range(start, end)

    if df.empty:
        return

    existing_dates = {
        d
        for (d,) in db.session.query(OpenMeteoWeather.datetime)
        .filter(OpenMeteoWeather.datetime.between(start, end))
        .all()
    }

    rows_to_insert = df[~df["datetime"].isin(existing_dates)]

    for row in rows_to_insert.itertuples(index=False):
        record = OpenMeteoWeather(
            datetime=row.datetime,
            tempmax=float(row.tempmax) if row.tempmax is not None else None,
            tempmin=float(row.tempmin) if row.tempmin is not None else None,
            humidity=float(row.humidity) if row.humidity is not None else None,
            windspeed=float(row.windspeed) if row.windspeed is not None else None,
            precip=float(row.precip) if row.precip is not None else None,
        )
        db.session.add(record)

    db.session.commit()


def update_travis_fires_daily() -> None:
    """Fill in missing rows in travis_fires_daily using NASA FIRMS API."""
    missing_range = _get_missing_range_for_travis_fires()
    if not missing_range:
        return

    start, end = missing_range
    df = fetch_travis_fires_daily_range(start, end)

    if df.empty:
        return

    existing_dates = {
        d
        for (d,) in db.session.query(TravisFiresDaily.acq_date)
        .filter(TravisFiresDaily.acq_date.between(start, end))
        .all()
    }

    rows_to_insert = df[~df["acq_date"].isin(existing_dates)]

    for row in rows_to_insert.itertuples(index=False):
        record = TravisFiresDaily(
            acq_date=row.acq_date,
            fire_count=int(row.fire_count),
            avg_brightness=float(row.avg_brightness)
            if row.avg_brightness is not None
            else None,
            avg_confidence=float(row.avg_confidence)
            if row.avg_confidence is not None
            else None,
            avg_frp=float(row.avg_frp) if row.avg_frp is not None else None,
            label=int(row.label) if row.label is not None else None,
        )
        db.session.add(record)

    db.session.commit()


@shared_task
def run_daily_ingest() -> None:
    """
    Celery task entry point.

    Called once per day by Celery Beat. Opens an app context,
    updates weather + fires, and commits.
    """
    app = create_app()
    with app.app_context():
        update_openmeteo_weather()
        update_travis_fires_daily()
