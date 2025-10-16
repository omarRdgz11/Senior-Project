from .hello import bp as hello_bp
from .health import bp as health_bp

def register_routes(app):
    app.register_blueprint(health_bp)
    app.register_blueprint(hello_bp)

