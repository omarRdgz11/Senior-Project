from .hello import bp as hello_bp
from .health import bp as health_bp
from .raw_detections import bp as raw_detections_bp
from .predict import bp_predict
from .features import bp_features
from .firms import firms_bp
from .grid import grid_bp

def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(hello_bp)
    app.register_blueprint(raw_detections_bp)
    app.register_blueprint(bp_predict)
    app.register_blueprint(bp_features)
    app.register_blueprint(firms_bp)
    app.register_blueprint(grid_bp)
    