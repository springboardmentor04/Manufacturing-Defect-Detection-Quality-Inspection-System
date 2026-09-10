FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir \
       --index-url https://download.pytorch.org/whl/cpu \
       torch torchvision \
    && python -m pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/main.py ./main.py

# AI code
COPY ai ./ai

# Trained YOLO model
COPY backend/app/main.py ./main.py

RUN mkdir -p /app/runs/detect /app/uploads

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]