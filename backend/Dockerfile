# syntax=docker/dockerfile:1
FROM python:3.12-slim

# ---- System packages ----
# - build-essential, libpq-dev: build wheels / psycopg headers
# - libgomp1: OpenMP runtime used by scikit-learn (prevents runtime errors)
# - curl: handy for in-container curl tests
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev libgomp1 curl \
 && rm -rf /var/lib/apt/lists/*

# ---- Runtime hygiene ----
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    # default threshold (can override in compose .env)
    FIRE_RISK_THRESHOLD=0.25

WORKDIR /app

# ---- Install Python deps first (better cache) ----
COPY requirements.txt .
RUN python -m pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ---- Copy app code + model ----
# If your .pkl is under app/model/, this single COPY includes it
COPY app ./app

# If your model is NOT inside app/, uncomment this line and adjust the path:
# COPY app/model/fire_prediction_model.pkl app/model/fire_prediction_model.pkl

# ---- Non-root user (safety) ----
# You’ll avoid “running as root” warnings and limit container privileges
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# ---- Flask dev server config ----
ENV FLASK_APP=app.__init__:create_app
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5005
EXPOSE 5005

# ---- Default command: dev server with auto-reload ----
CMD ["flask", "run", "--debug"]

