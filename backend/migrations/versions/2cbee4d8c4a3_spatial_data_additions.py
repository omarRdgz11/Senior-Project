"""spatial data additions

Revision ID: 2cbee4d8c4a3
Revises: e1f0cbe01139
Create Date: 2025-10-13 19:07:44.757841
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision = "2cbee4d8c4a3"
down_revision = "e1f0cbe01139"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # 1) Add / alter columns in a batch (this creates 'geom')
    with op.batch_alter_table("raw_detections", schema=None) as batch_op:
        batch_op.add_column(sa.Column("daynight", sa.String(1), nullable=True, server_default="D"))
        batch_op.add_column(sa.Column("acq_ts_utc", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("source_id", sa.String(20), nullable=True))
        batch_op.add_column(sa.Column("processing_level", sa.String(5), nullable=True))
        batch_op.add_column(sa.Column("geom", Geometry("POINT", srid=4326), nullable=True))
        batch_op.drop_column("timeofday")

    # 2) Now that the batch has flushed, it’s safe to index 'geom'
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_raw_detections_geom "
        "ON raw_detections USING GIST (geom);"
    )

    # 3) Backfill + enforce NOT NULL on daynight
    op.execute("UPDATE raw_detections SET daynight = COALESCE(daynight, 'D')")
    with op.batch_alter_table("raw_detections", schema=None) as batch_op:
        batch_op.alter_column("daynight", nullable=False, server_default=None)


def downgrade():
    # Drop index safely, then remove columns
    op.execute("DROP INDEX IF EXISTS idx_raw_detections_geom;")
    with op.batch_alter_table("raw_detections", schema=None) as batch_op:
        batch_op.add_column(sa.Column("timeofday", sa.String(1), nullable=False, server_default="D"))
        batch_op.drop_column("geom")
        batch_op.drop_column("processing_level")
        batch_op.drop_column("source_id")
        batch_op.drop_column("acq_ts_utc")
        batch_op.drop_column("daynight")
        batch_op.alter_column("timeofday", server_default=None)
