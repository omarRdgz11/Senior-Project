from .hello import bp as hello_bp
from .health import bp as health_bp
from .raw_detections import bp as raw_detections_bp
from .predict import bp_predict

def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(hello_bp)
    app.register_blueprint(raw_detections_bp)
    app.register_blueprint(bp_predict)