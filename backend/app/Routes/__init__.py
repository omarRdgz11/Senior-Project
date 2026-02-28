from .Testing.hello import bp as hello_bp
from .Testing.health import bp as health_bp
from .Testing.raw_detections import bp as raw_detections_bp
from .Predictions.predict import bp_predict
from .Predictions.features import bp_features
from .Predictions.firms import firms_bp
from .Predictions.grid import grid_bp
from .Predictions.predict_improved import bp_predict_improved
from .Dashboard.overview import bp_dashboard
from .Predictions.evacuation import bp_evacuation

def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(hello_bp)
    app.register_blueprint(raw_detections_bp)
    app.register_blueprint(bp_predict)
    app.register_blueprint(bp_features)
    app.register_blueprint(firms_bp)
    app.register_blueprint(grid_bp)
    app.register_blueprint(bp_predict_improved)
    app.register_blueprint(bp_dashboard)
    app.register_blueprint(bp_evacuation) 
    