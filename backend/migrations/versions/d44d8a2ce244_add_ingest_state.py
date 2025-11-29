"""add ingest_state

Revision ID: d44d8a2ce244
Revises: 2cbee4d8c4a3
Create Date: 2025-10-16 04:27:49.214117

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd44d8a2ce244'
down_revision = '2cbee4d8c4a3'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'ingest_state'
      ) THEN
        CREATE TABLE public.ingest_state (
          id                SERIAL PRIMARY KEY,
          source_id         VARCHAR(64) NOT NULL,
          bbox              VARCHAR(64) NOT NULL,
          last_acq_ts_utc   TIMESTAMPTZ,
          CONSTRAINT uq_ingest_source_bbox UNIQUE (source_id, bbox)
        );
      END IF;
    END
    $$;
    """)

def downgrade():
    op.execute("DROP TABLE IF EXISTS public.ingest_state;")
