# syntax=docker/dockerfile:1
FROM python:3.12-slim

# Install system deps for psycopg (if needed)
RUN apt-get update && apt-get install -y build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app ./app


# Enable flask auto-reload for dev inside container
ENV FLASK_APP=app.__init__:create_app
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5005
EXPOSE 5005


# Default command: run Flask dev server (good DX for dev)
CMD ["flask", "run", "--debug"]
