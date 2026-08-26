from ultralytics import YOLO

model = YOLO(r"C:\Users\veene.LAPTOP-VQNJ8SHT\runs\detect\train-12\weights\last.pt")
model.train(resume=True)