FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies for OpenCV, PyTorch, and Healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies with caching
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy application source code and models
COPY app ./app
COPY model ./model

# Ensure storage and upload directories exist
RUN mkdir -p /app/data/storage /app/temp_uploads

EXPOSE 8000

# Health check to ensure service is ready
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
