import os

label_dir = r"multiclass_defect_dataset\labels\train"

def iou(box1, box2):
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2
    xa1, ya1, xa2, ya2 = x1 - w1/2, y1 - h1/2, x1 + w1/2, y1 + h1/2
    xb1, yb1, xb2, yb2 = x2 - w2/2, y2 - h2/2, x2 + w2/2, y2 + h2/2
    inter_x1, inter_y1 = max(xa1, xb1), max(ya1, yb1)
    inter_x2, inter_y2 = min(xa2, xb2), min(ya2, yb2)
    inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
    area1, area2 = w1*h1, w2*h2
    union = area1 + area2 - inter_area
    return inter_area / union if union > 0 else 0

flagged = []
for fname in os.listdir(label_dir):
    path = os.path.join(label_dir, fname)
    with open(path) as f:
        lines = [l.split() for l in f if l.strip()]
    boxes = [(int(l[0]), tuple(map(float, l[1:5]))) for l in lines]
    for i in range(len(boxes)):
        for j in range(i+1, len(boxes)):
            if boxes[i][0] == boxes[j][0] and iou(boxes[i][1], boxes[j][1]) > 0.7:
                flagged.append(fname)

print(f"Found {len(flagged)} files with likely duplicate boxes:")
for f in sorted(set(flagged)):
    print(" -", f)