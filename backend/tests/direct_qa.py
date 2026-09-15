import os, sys, time, glob, csv, json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai-model')))
# pyrefly: ignore [missing-import]
from inference.yolo_infer import YOLOInferenceEngine

engine = YOLOInferenceEngine()
categories = [
    'bottle', 'cable', 'capsule', 'carpet', 'grid',
    'hazelnut', 'leather', 'metal_nut', 'pill', 'screw',
    'tile', 'toothbrush', 'transistor', 'wood', 'zipper'
]
test_images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai-model/yolo/dataset/images/test'))
results = []
metrics = {'TP': 0, 'TN': 0, 'FP': 0, 'FN': 0}

for cat in categories:
    good_files = glob.glob(os.path.join(test_images_dir, f'{cat}_*good*.png'))
    defect_files = [f for f in glob.glob(os.path.join(test_images_dir, f'{cat}_*.png')) if 'good' not in f]
    
    test_files = []
    if good_files: test_files.append((good_files[0], 'good'))
    if defect_files: test_files.append((defect_files[0], 'defective'))
    
    for filepath, ground_truth in test_files:
        filename = os.path.basename(filepath)
        start_time = time.time()
        result = engine.infer(filepath, category=cat)
        latency = time.time() - start_time
        
        prediction = result['prediction']
        is_correct = False
        if ground_truth == 'good':
            if prediction == 'PASS': 
                metrics['TN'] += 1
                is_correct = True
            else: 
                metrics['FP'] += 1
        else:
            if prediction == 'FAIL': 
                metrics['TP'] += 1
                is_correct = True
            else: 
                metrics['FN'] += 1
            
        results.append({
            'Category': cat, 'Image': filename, 'Ground Truth': ground_truth.upper(),
            'Prediction': prediction, 'Defect Type': result['defect_type'],
            'Confidence': result['confidence'], 'Severity': result.get('severity_level', 'N/A'),
            'Processing Time (s)': round(latency, 2), 'Correct': is_correct, 'API Status': 200
        })

total = sum(metrics.values())
accuracy = (metrics['TP'] + metrics['TN']) / total if total > 0 else 0
precision = metrics['TP'] / (metrics['TP'] + metrics['FP']) if (metrics['TP'] + metrics['FP']) > 0 else 0
recall = metrics['TP'] / (metrics['TP'] + metrics['FN']) if (metrics['TP'] + metrics['FN']) > 0 else 0
f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
fpr = metrics['FP'] / (metrics['FP'] + metrics['TN']) if (metrics['FP'] + metrics['TN']) > 0 else 0
fnr = metrics['FN'] / (metrics['FN'] + metrics['TP']) if (metrics['FN'] + metrics['TP']) > 0 else 0

print(f'\nMetrics:')
print(f'Accuracy: {accuracy:.2%}')
print(f'Precision: {precision:.2%}')
print(f'Recall: {recall:.2%}')
print(f'F1 Score: {f1:.2%}')
print(f'FPR: {fpr:.2%}')
print(f'FNR: {fnr:.2%}')

csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../reports/milestone_4a_test_results.csv'))
os.makedirs(os.path.dirname(csv_path), exist_ok=True)
with open(csv_path, 'w', newline='') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=results[0].keys())
    writer.writeheader()
    writer.writerows(results)
print('Done!')
