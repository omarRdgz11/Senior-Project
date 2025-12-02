from flask import Blueprint

bp_dashboard = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

# Import submodules to register routes
from . import overview
from . import weather
from . import fires
from . import watchlist
from . import insights
