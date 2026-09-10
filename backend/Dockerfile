FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for OpenCV and image operations
RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 libxcb1 libxext6 libsm6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Docker healthcheck instruction for deployment container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Use shell form CMD to allow environment variable expansion (PORT on Render)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}