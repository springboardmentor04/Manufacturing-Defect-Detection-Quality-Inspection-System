from ultralytics import YOLO

model = YOLO("backend/models/best.pt")
print("Loaded model:", model)
print("Classes:", model.names)
