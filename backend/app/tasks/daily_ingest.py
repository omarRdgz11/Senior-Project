# backend/app/tasks/daily_ingest.py

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta
from typing import Optional, Tuple

from celery import shared_task
from sqlalchemy import func

from app import create_app
from app.extensions import db
from app.Models.Region import Region
from app.Models.Fire.travis_fires_daily import TravisFiresDaily
from app.Models.Fire.fires_daily import FiresDaily
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from app.Models.Weather.weather_daily_regional import WeatherDailyRegional
from app.services.data_fetchers import (
    fetch_open_meteo_range,
    fetch_travis_fires_daily_range,
    fetch_open_meteo_range_for_region,
    fetch_fires_daily_range_for_region,
)

logger = logging.getLogger(__name__)


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
        logger.info("[legacy-weather] no missing range")
        return

    start, end = missing_range
    logger.info("[legacy-weather] fetch begin start=%s end=%s", start, end)
    df = fetch_open_meteo_range(start, end)

    if df.empty:
        logger.warning("[legacy-weather] empty dataframe start=%s end=%s", start, end)
        return

    existing_dates = {
        d
        for (d,) in db.session.query(OpenMeteoWeather.datetime)
        .filter(OpenMeteoWeather.datetime.between(start, end))
        .all()
    }

    rows_to_insert = df[~df["datetime"].isin(existing_dates)]

    logger.info(
        "[legacy-weather] fetched_rows=%s existing_dates=%s rows_to_insert=%s",
        len(df),
        len(existing_dates),
        len(rows_to_insert),
    )

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
    logger.info("[legacy-weather] commit complete inserted=%s", len(rows_to_insert))


def update_travis_fires_daily() -> None:
    """Fill in missing rows in travis_fires_daily using NASA FIRMS API."""
    missing_range = _get_missing_range_for_travis_fires()
    if not missing_range:
        logger.info("[legacy-fires] no missing range")
        return

    start, end = missing_range
    logger.info("[legacy-fires] fetch begin start=%s end=%s", start, end)
    df = fetch_travis_fires_daily_range(start, end)

    if df.empty:
        logger.warning("[legacy-fires] empty dataframe start=%s end=%s", start, end)
        return

    existing_dates = {
        d
        for (d,) in db.session.query(TravisFiresDaily.acq_date)
        .filter(TravisFiresDaily.acq_date.between(start, end))
        .all()
    }

    rows_to_insert = df[~df["acq_date"].isin(existing_dates)]

    logger.info(
        "[legacy-fires] fetched_rows=%s existing_dates=%s rows_to_insert=%s",
        len(df),
        len(existing_dates),
        len(rows_to_insert),
    )

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
    logger.info("[legacy-fires] commit complete inserted=%s", len(rows_to_insert))


def _get_missing_range_for_weather_regional(region_id: int) -> Optional[Tuple[date, date]]:
    """Return (start, end) date for which we need to backfill WeatherDailyRegional for a region."""
    last_date: Optional[date] = db.session.query(
        func.max(WeatherDailyRegional.date)
    ).filter(WeatherDailyRegional.region_id == region_id).scalar()

    if last_date is None:
        start = _parse_data_start_date()
    else:
        start = last_date + timedelta(days=1)

    target = date.today() - timedelta(days=1)
    if start > target:
        return None

    return start, target


def _get_missing_range_for_fires_daily(region_id: int) -> Optional[Tuple[date, date]]:
    """Return (start, end) date for which we need to backfill FiresDaily for a region."""
    last_date: Optional[date] = db.session.query(
        func.max(FiresDaily.acq_date)
    ).filter(FiresDaily.region_id == region_id).scalar()

    if last_date is None:
        start = _parse_data_start_date()
    else:
        start = last_date + timedelta(days=1)

    target = date.today() - timedelta(days=1)
    if start > target:
        return None

    return start, target


def update_weather_for_region(region: Region) -> None:
    """Fill in missing rows in weather_daily_regional for a specific region."""
    try:
        logger.info(
            "[regional-weather] start region_id=%s slug=%s name=%s center_lat=%s center_lon=%s",
            region.id,
            getattr(region, "slug", None),
            getattr(region, "name", None),
            getattr(region, "center_lat", None),
            getattr(region, "center_lon", None),
        )

        missing_range = _get_missing_range_for_weather_regional(region.id)
        if not missing_range:
            logger.info(
                "[regional-weather] no missing range region_id=%s slug=%s",
                region.id,
                getattr(region, "slug", None),
            )
            return

        start, end = missing_range
        logger.info(
            "[regional-weather] fetch begin region_id=%s slug=%s start=%s end=%s",
            region.id,
            getattr(region, "slug", None),
            start,
            end,
        )

        df = fetch_open_meteo_range_for_region(region, start, end)

        logger.info(
            "[regional-weather] fetch result region_id=%s slug=%s rows=%s cols=%s columns=%s",
            region.id,
            getattr(region, "slug", None),
            0 if df is None else len(df),
            0 if df is None else len(df.columns),
            [] if df is None else list(df.columns),
        )

        if df.empty:
            logger.warning(
                "[regional-weather] empty dataframe region_id=%s slug=%s start=%s end=%s",
                region.id,
                getattr(region, "slug", None),
                start,
                end,
            )
            return

        existing_dates = {
            d
            for (d,) in db.session.query(WeatherDailyRegional.date)
            .filter(
                WeatherDailyRegional.region_id == region.id,
                WeatherDailyRegional.date.between(start, end),
            )
            .all()
        }

        logger.info(
            "[regional-weather] existing dates region_id=%s slug=%s count=%s",
            region.id,
            getattr(region, "slug", None),
            len(existing_dates),
        )

        rows_to_insert = df[~df["date"].isin(existing_dates)]

        logger.info(
            "[regional-weather] rows_to_insert region_id=%s slug=%s insert_count=%s",
            region.id,
            getattr(region, "slug", None),
            len(rows_to_insert),
        )

        for row in rows_to_insert.itertuples(index=False):
            record = WeatherDailyRegional(
                region_id=region.id,
                date=row.date,
                tempmax=float(row.tempmax) if row.tempmax is not None else None,
                tempmin=float(row.tempmin) if row.tempmin is not None else None,
                humidity=float(row.humidity) if row.humidity is not None else None,
                windspeed=float(row.windspeed) if row.windspeed is not None else None,
                precip=float(row.precip) if row.precip is not None else None,
            )
            db.session.add(record)

        db.session.commit()

        logger.info(
            "[regional-weather] commit complete region_id=%s slug=%s inserted=%s",
            region.id,
            getattr(region, "slug", None),
            len(rows_to_insert),
        )
    except Exception:
        logger.exception(
            "[regional-weather] failed region_id=%s slug=%s",
            region.id,
            getattr(region, "slug", None),
        )
        raise


def update_fires_for_region(region: Region) -> None:
    """Fill in missing rows in fires_daily for a specific region."""
    try:
        logger.info(
            "[regional-fires] start region_id=%s slug=%s name=%s",
            region.id,
            getattr(region, "slug", None),
            getattr(region, "name", None),
        )

        missing_range = _get_missing_range_for_fires_daily(region.id)
        if not missing_range:
            logger.info(
                "[regional-fires] no missing range region_id=%s slug=%s",
                region.id,
                getattr(region, "slug", None),
            )
            return

        start, end = missing_range
        logger.info(
            "[regional-fires] fetch begin region_id=%s slug=%s start=%s end=%s",
            region.id,
            getattr(region, "slug", None),
            start,
            end,
        )

        df = fetch_fires_daily_range_for_region(region, start, end)

        logger.info(
            "[regional-fires] fetch result region_id=%s slug=%s rows=%s cols=%s columns=%s",
            region.id,
            getattr(region, "slug", None),
            0 if df is None else len(df),
            0 if df is None else len(df.columns),
            [] if df is None else list(df.columns),
        )

        if df.empty:
            logger.warning(
                "[regional-fires] empty dataframe region_id=%s slug=%s start=%s end=%s",
                region.id,
                getattr(region, "slug", None),
                start,
                end,
            )
            return

        existing_dates = {
            d
            for (d,) in db.session.query(FiresDaily.acq_date)
            .filter(
                FiresDaily.region_id == region.id,
                FiresDaily.acq_date.between(start, end),
            )
            .all()
        }

        logger.info(
            "[regional-fires] existing dates region_id=%s slug=%s count=%s",
            region.id,
            getattr(region, "slug", None),
            len(existing_dates),
        )

        rows_to_insert = df[~df["acq_date"].isin(existing_dates)]

        logger.info(
            "[regional-fires] rows_to_insert region_id=%s slug=%s insert_count=%s",
            region.id,
            getattr(region, "slug", None),
            len(rows_to_insert),
        )

        for row in rows_to_insert.itertuples(index=False):
            record = FiresDaily(
                region_id=region.id,
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

        logger.info(
            "[regional-fires] commit complete region_id=%s slug=%s inserted=%s",
            region.id,
            getattr(region, "slug", None),
            len(rows_to_insert),
        )
    except Exception:
        logger.exception(
            "[regional-fires] failed region_id=%s slug=%s",
            region.id,
            getattr(region, "slug", None),
        )
        raise


def update_all_regions() -> None:
    """Update weather and fires data for all regions."""
    regions = Region.query.all()
    logger.info("[daily-ingest] loaded regions count=%s", len(regions))

    if not regions:
        logger.warning("[daily-ingest] no regions found")
        return

    for region in regions:
        logger.info(
            "[daily-ingest] processing region_id=%s slug=%s name=%s",
            region.id,
            getattr(region, "slug", None),
            getattr(region, "name", None),
        )
        try:
            update_weather_for_region(region)
            update_fires_for_region(region)
            logger.info(
                "[daily-ingest] completed region_id=%s slug=%s",
                region.id,
                getattr(region, "slug", None),
            )
        except Exception:
            logger.exception(
                "[daily-ingest] error updating region_id=%s slug=%s",
                region.id,
                getattr(region, "slug", None),
            )
            # Continue with other regions even if one fails
            db.session.rollback()

    logger.info("[daily-ingest] regional ingest complete")


@shared_task
def run_daily_ingest() -> None:
    """
    Celery task entry point.

    Called once per day by Celery Beat. Opens an app context,
    updates weather + fires for all regions, and commits.
    """
    app = create_app()
    with app.app_context():
        logger.info("[daily-ingest] task start")

        # Update legacy tables (for backward compatibility with Austin/Travis)
        update_openmeteo_weather()
        update_travis_fires_daily()

        # Update new multi-region tables
        update_all_regions()

        logger.info("[daily-ingest] task complete")
