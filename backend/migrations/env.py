import logging
from logging.config import fileConfig

from flask import current_app
from alembic import context

# Alembic Config object gives access to .ini file values.
config = context.config

# Set up loggers.
fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')


def get_engine():
    """Return SQLAlchemy engine from current Flask app."""
    try:
        # Works with Flask-SQLAlchemy <3
        return current_app.extensions['migrate'].db.get_engine()
    except (TypeError, AttributeError):
        # Works with Flask-SQLAlchemy >=3
        return current_app.extensions['migrate'].db.engine


def get_engine_url():
    """Render the database URL as string for offline migrations."""
    try:
        return get_engine().url.render_as_string(hide_password=False).replace('%', '%%')
    except AttributeError:
        return str(get_engine().url).replace('%', '%%')


# --- Bind Flask-Migrate metadata to Alembic ---
config.set_main_option('sqlalchemy.url', get_engine_url())
target_db = current_app.extensions['migrate'].db


def get_metadata():
    """Return SQLAlchemy MetaData object for autogenerate support."""
    if hasattr(target_db, 'metadatas'):
        return target_db.metadatas[None]
    return target_db.metadata


# --- Main migration runners ---

def run_migrations_offline():
    """Run migrations in 'offline' mode (no DB connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=get_metadata(),
        literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode (with DB connection)."""

    # 🔒 Filter out PostGIS / TIGER / topology tables so Alembic ignores them.
    def include_object(object, name, type_, reflected, compare_to):
        schema = getattr(object, "schema", None)
        if type_ == "table":
            # Exclude PostGIS/TIGER schemas
            if schema in {"tiger", "tiger_data", "topology"}:
                return False
            # Exclude PostGIS-managed tables in public
            if name in {
                "spatial_ref_sys",
                "geography_columns",
                "geometry_columns",
                "raster_columns",
                "raster_overviews",
            }:
                return False
        return True

    # Custom callback: skip empty autogenerates
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    # Grab base configuration from Flask-Migrate
    conf_args = current_app.extensions["migrate"].configure_args

    # Safe defaults — only set if not already defined
    conf_args.setdefault("include_schemas", True)
    conf_args.setdefault("include_object", include_object)
    conf_args.setdefault("compare_type", True)
    conf_args.setdefault("compare_server_default", True)
    conf_args.setdefault("process_revision_directives", process_revision_directives)

    connectable = get_engine()

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            **conf_args  # 👈 Avoids duplicate keyword errors
        )
        with context.begin_transaction():
            context.run_migrations()


# --- Entrypoint ---
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
