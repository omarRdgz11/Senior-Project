"""add FIRMS and weather tables

Revision ID: 8a89d60ce752
Revises: d44d8a2ce244
Create Date: 2025-10-26 18:12:52.610915
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "8a89d60ce752"
down_revision = "d44d8a2ce244"
branch_labels = None
depends_on = None


def upgrade():
    # --- FIRMS / VIIRS detections (minimal columns for Level 2/3) ---
    op.create_table(
        "firms_viirs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("acq_date", sa.Date, nullable=False),          # e.g., 2024-07-15
        sa.Column("acq_time", sa.String(length=4), nullable=False),  # "HHMM" zero-padded
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("satellite", sa.String(length=8), nullable=True),   # e.g., "SNPP"
        sa.Column("instrument", sa.String(length=16), nullable=True), # e.g., "VIIRS"
        sa.Column("daynight", sa.String(length=1), nullable=True),    # "D" / "N"
    )
    op.create_index("ix_firms_dt", "firms_viirs", ["acq_date"])
    op.create_index("ix_firms_latlon", "firms_viirs", ["latitude", "longitude"])
    op.create_unique_constraint(
        "uq_firms_acq_latlon",
        "firms_viirs",
        ["acq_date", "acq_time", "latitude", "longitude", "satellite"],
    )

    # --- Weather daily (point series) ---
    op.create_table(
        "weather_daily",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("tempmax", sa.Float, nullable=True),
        sa.Column("tempmin", sa.Float, nullable=True),
        sa.Column("precip", sa.Float, nullable=True),
        sa.Column("humidity", sa.Float, nullable=True),
        sa.Column("wind", sa.Float, nullable=True),
    )
    op.create_index("ix_weather_date", "weather_daily", ["date"])
    op.create_index("ix_weather_latlon", "weather_daily", ["latitude", "longitude"])
    op.create_unique_constraint(
        "uq_weather_date_latlon",
        "weather_daily",
        ["date", "latitude", "longitude"],
    )


def downgrade():
    # Drop weather first (reverse of creation order)
    op.drop_constraint("uq_weather_date_latlon", "weather_daily", type_="unique")
    op.drop_index("ix_weather_latlon", table_name="weather_daily")
    op.drop_index("ix_weather_date", table_name="weather_daily")
    op.drop_table("weather_daily")

    # Drop FIRMS next
    op.drop_constraint("uq_firms_acq_latlon", "firms_viirs", type_="unique")
    op.drop_index("ix_firms_latlon", table_name="firms_viirs")
    op.drop_index("ix_firms_dt", table_name="firms_viirs")
    op.drop_table("firms_viirs")
