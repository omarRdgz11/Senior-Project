# """true raw detection schema

# Revision ID: e1f0cbe01139
# Revises: 2e6e7f32d36e
# Create Date: 2025-09-25 20:14:00.179185

# """
# from alembic import op
# import sqlalchemy as sa


# # revision identifiers, used by Alembic.
# revision = 'e1f0cbe01139'
# down_revision = '2e6e7f32d36e'
# branch_labels = None
# depends_on = None


# def upgrade():
#      # Add dedupe key + helpful indexes on raw_detections
#     op.create_unique_constraint(
#         "uq_raw_spacetime_sat",
#         "raw_detections",
#         ["acq_date", "acq_time", "latitude", "longitude", "satellite"],
#     )
#     op.create_index(
#         "ix_raw_date_time",
#         "raw_detections",
#         ["acq_date", "acq_time"],
#         unique=False,
#     )
#     op.create_index(
#         "ix_raw_lat_lon",
#         "raw_detections",
#         ["latitude", "longitude"],
#         unique=False,
#     )


# def downgrade():
#     # Reverse of upgrade: drop indexes, then the constraint
#     op.drop_index("ix_raw_lat_lon", table_name="raw_detections")
#     op.drop_index("ix_raw_date_time", table_name="raw_detections")
#     op.drop_constraint("uq_raw_spacetime_sat", "raw_detections", type_="unique")

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e1f0cbe01139'
down_revision = '2e6e7f32d36e'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # Unique constraint: only create if missing
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_raw_spacetime_sat'
      ) THEN
        ALTER TABLE raw_detections
          ADD CONSTRAINT uq_raw_spacetime_sat
          UNIQUE (acq_date, acq_time, latitude, longitude, satellite);
      END IF;
    END$$;
    """)

    # Indexes: use IF NOT EXISTS (Postgres supports this)
    op.execute("CREATE INDEX IF NOT EXISTS ix_raw_date_time ON raw_detections (acq_date, acq_time);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_raw_lat_lon   ON raw_detections (latitude, longitude);")


def downgrade():
    # Drop indexes if present
    op.execute("DROP INDEX IF EXISTS ix_raw_lat_lon;")
    op.execute("DROP INDEX IF EXISTS ix_raw_date_time;")

    # Drop constraint if present
    op.execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_raw_spacetime_sat'
      ) THEN
        ALTER TABLE raw_detections DROP CONSTRAINT uq_raw_spacetime_sat;
      END IF;
    END$$;
    """)
