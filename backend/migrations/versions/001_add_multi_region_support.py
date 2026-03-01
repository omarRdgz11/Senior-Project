#backend/migrations/versions/001_add_multi_region_support.py
"""add multi-region support

Revision ID: 001_add_multi_region_support
Revises: 8a89d60ce752
Create Date: 2026-02-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "001_add_multi_region_support"
down_revision = "8a89d60ce752"
branch_labels = None
depends_on = None


def upgrade():
    # --- Create regions table ---
    op.create_table(
        "regions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("slug", sa.String(length=64), nullable=False, unique=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("center_lat", sa.Float, nullable=False),
        sa.Column("center_lon", sa.Float, nullable=False),
        sa.Column("bbox_w", sa.Float, nullable=False),
        sa.Column("bbox_s", sa.Float, nullable=False),
        sa.Column("bbox_e", sa.Float, nullable=False),
        sa.Column("bbox_n", sa.Float, nullable=False),
    )
    op.create_index("ix_regions_slug", "regions", ["slug"], unique=True)

    # --- Create fires_daily table (multi-region) ---
    op.create_table(
        "fires_daily",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("region_id", sa.Integer, nullable=False),
        sa.Column("acq_date", sa.Date, nullable=False),
        sa.Column("fire_count", sa.Integer, nullable=False),
        sa.Column("avg_brightness", sa.Float, nullable=True),
        sa.Column("avg_confidence", sa.Float, nullable=True),
        sa.Column("avg_frp", sa.Float, nullable=True),
        sa.Column("label", sa.Integer, nullable=True),
        sa.ForeignKeyConstraint(["region_id"], ["regions.id"], name="fk_fires_daily_region"),
        sa.UniqueConstraint("region_id", "acq_date", name="uq_fires_daily_region_date"),
    )
    op.create_index("ix_fires_daily_region_date", "fires_daily", ["region_id", "acq_date"])

    # --- Create weather_daily_regional table (multi-region) ---
    op.create_table(
        "weather_daily_regional",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("region_id", sa.Integer, nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("tempmax", sa.Float, nullable=True),
        sa.Column("tempmin", sa.Float, nullable=True),
        sa.Column("humidity", sa.Float, nullable=True),
        sa.Column("windspeed", sa.Float, nullable=True),
        sa.Column("precip", sa.Float, nullable=True),
        sa.ForeignKeyConstraint(["region_id"], ["regions.id"], name="fk_weather_daily_regional_region"),
        sa.UniqueConstraint("region_id", "date", name="uq_weather_daily_regional_region_date"),
    )
    op.create_index("ix_weather_daily_regional_region_date", "weather_daily_regional", ["region_id", "date"])

    # --- Seed regions data for 4 Texas cities ---
    # Approximate bounding boxes (about 0.5 degree buffer around city centers)
    op.execute("""
        INSERT INTO regions (slug, name, center_lat, center_lon, bbox_w, bbox_s, bbox_e, bbox_n) VALUES
        ('austin', 'Austin', 30.2672, -97.7431, -98.2, 29.8, -97.2, 30.7),
        ('dallas', 'Dallas', 32.7767, -96.7970, -97.3, 32.3, -96.3, 33.2),
        ('houston', 'Houston', 29.7604, -95.3698, -95.9, 29.3, -94.8, 30.2),
        ('san_antonio', 'San Antonio', 29.4241, -98.4936, -99.0, 29.0, -98.0, 29.9)
    """)


def downgrade():
    # Drop new tables in reverse order
    op.drop_index("ix_weather_daily_regional_region_date", table_name="weather_daily_regional")
    op.drop_constraint("fk_weather_daily_regional_region", "weather_daily_regional", type_="foreignkey")
    op.drop_constraint("uq_weather_daily_regional_region_date", "weather_daily_regional", type_="unique")
    op.drop_table("weather_daily_regional")

    op.drop_index("ix_fires_daily_region_date", table_name="fires_daily")
    op.drop_constraint("fk_fires_daily_region", "fires_daily", type_="foreignkey")
    op.drop_constraint("uq_fires_daily_region_date", "fires_daily", type_="unique")
    op.drop_table("fires_daily")

    op.drop_index("ix_regions_slug", table_name="regions")
    op.drop_table("regions")
