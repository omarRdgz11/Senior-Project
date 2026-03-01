#!/usr/bin/env python3
"""
WildSight – Prediction Evaluation Script
=========================================

Evaluates the ML model's historical accuracy against real fire detections.

Usage (inside Docker):
    docker compose exec backend python scripts/eval_predictions.py
    docker compose exec backend python scripts/eval_predictions.py --days 90
    docker compose exec backend python scripts/eval_predictions.py --days 30 --out /tmp/eval.csv

What it does:
    1. Loads fire + weather history from the DB for each region.
    2. Engineers features the same way the live model does (via improved_model/).
    3. Runs the CatBoost champion model on each day's feature row.
    4. Compares predicted label (0/1) to ground truth label (fire_count > 0).
    5. Prints per-region and overall precision / recall / F1 to the console.
    6. Writes a per-day CSV to --out (default: scripts/eval_results.csv).

Notes on methodology:
    - Ground truth: fire_count > 0 for that day/region (from DB).
    - All lag/rolling features use .shift(1), so day T prediction only sees data
      up to T-1.  No per-day future leakage.
    - MINOR CAVEAT: month_avg_fires / quarter_avg_fires are group-means computed
      over the FULL evaluated window (not a rolling window). This introduces a
      small in-sample bias for those two features. All other features are clean.
    - This is an in-sample historical evaluation, not a held-out test set.
      Use it as a sanity check and a demo talking point, not as final accuracy.
"""

import sys
import os
import argparse
import csv
from pathlib import Path
from datetime import date

# ---------------------------------------------------------------------------
# Path setup – add backend/ root so "from app import ..." works when the
# script is run directly (not via `python -m`).
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pandas as pd
import numpy as np

# ---------------------------------------------------------------------------
# These imports require the Flask app to be imported first so SQLAlchemy
# models are initialised.  We create a minimal app context below.
# ---------------------------------------------------------------------------
from app import create_app
from app.extensions import db
from app.Models.Fire.travis_fires_daily import TravisFiresDaily
from app.Models.Fire.fires_daily import FiresDaily
from app.Models.Region import Region
from app.Models.Weather.OpenMeteo_weather import OpenMeteoWeather
from app.Models.Weather.weather_daily_regional import WeatherDailyRegional
from app.improved_model import (
    engineer_features,
    predict_fire_risk,
)


# ---------------------------------------------------------------------------
# Data loading helpers
# ---------------------------------------------------------------------------

def load_austin_history() -> pd.DataFrame:
    """Load legacy Austin fire + weather into a merged DataFrame."""
    fires = (
        db.session.query(
            TravisFiresDaily.acq_date,
            TravisFiresDaily.fire_count,
        )
        .order_by(TravisFiresDaily.acq_date)
        .all()
    )
    fires_df = pd.DataFrame(fires, columns=["acq_date", "fire_count"])

    weather = (
        db.session.query(
            OpenMeteoWeather.datetime.label("acq_date"),
            OpenMeteoWeather.tempmax,
            OpenMeteoWeather.tempmin,
            OpenMeteoWeather.humidity,
            OpenMeteoWeather.windspeed,
            OpenMeteoWeather.precip,
        )
        .order_by(OpenMeteoWeather.datetime)
        .all()
    )
    weather_df = pd.DataFrame(
        weather,
        columns=["acq_date", "tempmax", "tempmin", "humidity", "windspeed", "precip"],
    )

    merged = (
        pd.merge(weather_df, fires_df, on="acq_date", how="left")
        .sort_values("acq_date")
        .reset_index(drop=True)
    )
    merged["fire_count"] = merged["fire_count"].fillna(0).astype(int)
    return merged


def load_region_history(region_id: int) -> pd.DataFrame:
    """Load multi-region fire + weather into a merged DataFrame."""
    fires = (
        db.session.query(
            FiresDaily.acq_date,
            FiresDaily.fire_count,
        )
        .filter(FiresDaily.region_id == region_id)
        .order_by(FiresDaily.acq_date)
        .all()
    )
    fires_df = pd.DataFrame(fires, columns=["acq_date", "fire_count"])

    weather = (
        db.session.query(
            WeatherDailyRegional.date.label("acq_date"),
            WeatherDailyRegional.tempmax,
            WeatherDailyRegional.tempmin,
            WeatherDailyRegional.humidity,
            WeatherDailyRegional.windspeed,
            WeatherDailyRegional.precip,
        )
        .filter(WeatherDailyRegional.region_id == region_id)
        .order_by(WeatherDailyRegional.date)
        .all()
    )
    weather_df = pd.DataFrame(
        weather,
        columns=["acq_date", "tempmax", "tempmin", "humidity", "windspeed", "precip"],
    )

    if fires_df.empty or weather_df.empty:
        return pd.DataFrame()

    merged = (
        pd.merge(weather_df, fires_df, on="acq_date", how="left")
        .sort_values("acq_date")
        .reset_index(drop=True)
    )
    merged["fire_count"] = merged["fire_count"].fillna(0).astype(int)
    return merged


# ---------------------------------------------------------------------------
# Evaluation logic
# ---------------------------------------------------------------------------

MIN_ROWS_REQUIRED = 35  # need enough history for rolling features to stabilise


def run_evaluation(history_df: pd.DataFrame, days: int) -> list[dict]:
    """
    Run the champion model on the last `days` rows of `history_df`.

    Returns a list of dicts with keys:
        date, label_true, label_pred, prob
    """
    if history_df is None or len(history_df) < MIN_ROWS_REQUIRED:
        return []

    feat_df = engineer_features(history_df)
    feat_df = feat_df.tail(days).reset_index(drop=True)

    results = []
    for _, row in feat_df.iterrows():
        feature_row = row.to_dict()
        try:
            pred = predict_fire_risk(feature_row)
            label_pred = int(pred["champion"]["label"])
            prob = float(pred["champion"]["prob"])
        except Exception as exc:  # noqa: BLE001
            print(f"  [warn] model error on {row.get('acq_date')}: {exc}", file=sys.stderr)
            continue

        label_true = int(feature_row.get("fire_count", 0) > 0)
        acq_date = row["acq_date"]
        date_str = acq_date.isoformat() if hasattr(acq_date, "isoformat") else str(acq_date)[:10]

        results.append(
            {
                "date": date_str,
                "label_true": label_true,
                "label_pred": label_pred,
                "prob": round(prob, 4),
            }
        )

    return results


def compute_metrics(results: list[dict]) -> dict:
    """Compute precision, recall, F1 from a list of result dicts."""
    if not results:
        return {
            "n": 0,
            "tp": 0, "fp": 0, "fn": 0, "tn": 0,
            "fire_days": 0,
            "precision": None,
            "recall": None,
            "f1": None,
        }

    tp = sum(1 for r in results if r["label_pred"] == 1 and r["label_true"] == 1)
    fp = sum(1 for r in results if r["label_pred"] == 1 and r["label_true"] == 0)
    fn = sum(1 for r in results if r["label_pred"] == 0 and r["label_true"] == 1)
    tn = sum(1 for r in results if r["label_pred"] == 0 and r["label_true"] == 0)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    return {
        "n": len(results),
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "fire_days": tp + fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def fmt_pct(v) -> str:
    return f"{v * 100:.1f}%" if v is not None else "N/A"


def print_table(rows: list[dict]) -> None:
    """Print a formatted table to stdout."""
    col_widths = {"region": 16, "n": 6, "fire_days": 10, "tp": 5, "fp": 5, "fn": 5, "precision": 11, "recall": 8, "f1": 8}
    header = (
        f"{'Region':<{col_widths['region']}} "
        f"{'Days':>{col_widths['n']}} "
        f"{'FireDays':>{col_widths['fire_days']}} "
        f"{'TP':>{col_widths['tp']}} "
        f"{'FP':>{col_widths['fp']}} "
        f"{'FN':>{col_widths['fn']}} "
        f"{'Precision':>{col_widths['precision']}} "
        f"{'Recall':>{col_widths['recall']}} "
        f"{'F1':>{col_widths['f1']}}"
    )
    sep = "-" * len(header)
    print(sep)
    print(header)
    print(sep)
    for r in rows:
        print(
            f"{r['region']:<{col_widths['region']}} "
            f"{r['n']:>{col_widths['n']}} "
            f"{r['fire_days']:>{col_widths['fire_days']}} "
            f"{r['tp']:>{col_widths['tp']}} "
            f"{r['fp']:>{col_widths['fp']}} "
            f"{r['fn']:>{col_widths['fn']}} "
            f"{fmt_pct(r['precision']):>{col_widths['precision']}} "
            f"{fmt_pct(r['recall']):>{col_widths['recall']}} "
            f"{fmt_pct(r['f1']):>{col_widths['f1']}}"
        )
    print(sep)


def write_csv(all_rows: list[dict], out_path: str) -> None:
    """Write per-day results to CSV (date, region, label_true, label_pred, prob)."""
    with open(out_path, "w", newline="") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=["date", "region", "label_true", "label_pred", "prob"],
        )
        writer.writeheader()
        writer.writerows(all_rows)
    print(f"\nPer-day CSV written to: {out_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="WildSight prediction evaluation")
    parser.add_argument(
        "--days",
        type=int,
        default=90,
        help="Number of most-recent days to evaluate (default: 90)",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=str(Path(__file__).parent / "eval_results.csv"),
        help="Output CSV file path (default: scripts/eval_results.csv)",
    )
    args = parser.parse_args()

    print(f"\n{'=' * 60}")
    print(f"  WildSight Prediction Evaluation  |  last {args.days} days")
    print(f"{'=' * 60}")
    print("  Methodology: champion CatBoost model, in-sample historical eval")
    print("  Ground truth: fire_count > 0 per day/region (FIRMS/VIIRS aggregated)")
    print("  Features: lag/rolling features with shift(1) — no per-day leakage")
    print("  Caveat: month/quarter group-means computed over full window (minor bias)")
    print(f"{'=' * 60}\n")

    app = create_app()
    all_day_rows: list[dict] = []
    summary_rows: list[dict] = []

    with app.app_context():
        # ------------------------------------------------------------------
        # 1. Legacy Austin (travis_fires_daily + openmeteo_weather)
        # ------------------------------------------------------------------
        print("Loading Austin (legacy) …", end=" ", flush=True)
        austin_df = load_austin_history()
        if not austin_df.empty:
            results = run_evaluation(austin_df, args.days)
            metrics = compute_metrics(results)
            print(f"{len(results)} rows evaluated.")
            for r in results:
                r["region"] = "austin"
            all_day_rows.extend(results)
            summary_rows.append({"region": "austin", **metrics})
        else:
            print("no data found.")

        # ------------------------------------------------------------------
        # 2. Multi-region (fires_daily + weather_daily_regional)
        # ------------------------------------------------------------------
        regions = db.session.query(Region).order_by(Region.slug).all()
        for region in regions:
            if region.slug == "austin":
                # skip austin here – already covered by legacy tables above
                # (they may differ if both are populated; keep legacy as canonical)
                pass

            print(f"Loading {region.slug} (multi-region) …", end=" ", flush=True)
            hist_df = load_region_history(region.id)
            if hist_df.empty:
                print("no data.")
                continue

            results = run_evaluation(hist_df, args.days)
            if not results:
                print("not enough rows for feature engineering (need ≥35).")
                continue

            metrics = compute_metrics(results)
            print(f"{len(results)} rows evaluated.")

            region_label = f"{region.slug} (mr)"
            for r in results:
                r["region"] = region.slug
            all_day_rows.extend(results)
            summary_rows.append({"region": region_label, **metrics})

        # ------------------------------------------------------------------
        # 3. Overall aggregate
        # ------------------------------------------------------------------
        if all_day_rows:
            overall = compute_metrics(all_day_rows)
            summary_rows.append({"region": "OVERALL", **overall})

    # -----------------------------------------------------------------------
    # Print summary table
    # -----------------------------------------------------------------------
    print(f"\n{'=' * 60}")
    print("  Per-Region Summary")
    print(f"{'=' * 60}")
    if summary_rows:
        print_table(summary_rows)
    else:
        print("  No results — check DB connectivity and data availability.")

    # -----------------------------------------------------------------------
    # Write per-day CSV
    # -----------------------------------------------------------------------
    if all_day_rows:
        write_csv(all_day_rows, args.out)
    else:
        print("\nNo data to write to CSV.")

    print("\nDone.\n")


if __name__ == "__main__":
    main()
