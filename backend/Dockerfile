# Multi-stage production Dockerfile for VisionInspect AI Backend
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies for C-extensions (psycopg2, opencv)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final runtime image
FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime system dependencies for OpenCV and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code and ML modules
COPY backend /app/backend
COPY ml /app/ml

# Environment configuration
ENV PYTHONPATH=/app/backend:/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV MODEL_PATH=/app/ml/models/best.pt
ENV UPLOAD_DIR=/app/storage/uploads

# Create required directories
RUN mkdir -p /app/storage/uploads /app/ml/models

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
