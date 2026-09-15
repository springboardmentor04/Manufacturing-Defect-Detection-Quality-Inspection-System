import os
import glob
import time
import requests
import json
import csv
import sys
import uuid

base_url = 'http://localhost:8000/api/v1'

# 1. Signup / Login
unique_id = str(uuid.uuid4())[:8]
email = f"qa_bot_{unique_id}@test.com"
password = "TestPassword123!"

signup_payload = {
    "name": "QA Bot",
    "employee_id": f"QA-{unique_id}",
    "email": email,
    "role": "QUALITY_ENGINEER",
    "password": password
}
r1 = requests.post(f'{base_url}/auth/register', json=signup_payload)

login_data = {
    "username": email,
    "password": password
}
login_resp = requests.post(f'{base_url}/auth/login', data=login_data)
if login_resp.status_code != 200:
    print("Failed to authenticate.")
    sys.exit(1)

token = login_resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# Define categories
categories = [
    'bottle', 'cable', 'capsule', 'carpet', 'grid',
    'hazelnut', 'leather', 'metal_nut', 'pill', 'screw',
    'tile', 'toothbrush', 'transistor', 'wood', 'zipper'
]

test_images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai-model/yolo/dataset/images/test'))

results = []
metrics = {'TP': 0, 'TN': 0, 'FP': 0, 'FN': 0}

print('Starting E2E 15-Category Test...')

for cat in categories:
    good_files = glob.glob(os.path.join(test_images_dir, f'{cat}_*good*.png'))
    defect_files = [f for f in glob.glob(os.path.join(test_images_dir, f'{cat}_*.png')) if 'good' not in f]
    
    test_files = []
    if good_files: test_files.append((good_files[0], 'good'))
    if defect_files: test_files.append((defect_files[0], 'defective'))
    
    for filepath, ground_truth in test_files:
        filename = os.path.basename(filepath)
        print(f'Testing {filename} ({cat})...')
        
        with open(filepath, 'rb') as f:
            # Upload
            start_time = time.time()
            upload_resp = requests.post(f'{base_url}/upload/image', headers=headers, files={'file': (filename, f, 'image/png')})
            if upload_resp.status_code != 200:
                print(f"Upload failed: {upload_resp.text}")
                continue
                
            image_url = upload_resp.json().get('url')
            
            # Create
            create_resp = requests.post(f'{base_url}/inspections/create', headers=headers, json={
                'engineer_id': r1.json().get('user', {}).get('id', f'QA-{unique_id}'),
                'employee_id': f'QA-{unique_id}',
                'engineer_name': 'QA Bot',
                'dataset_category': cat,
                'image_path': image_url,
                'original_filename': filename,
                'source': 'QA Test'
            })
            if create_resp.status_code != 200:
                print(f"Create failed: {create_resp.text}")
                continue
                
            inspection_id = create_resp.json().get('inspection_id')
            
            # Poll
            res_data = None
            for _ in range(30):
                poll_resp = requests.get(f'{base_url}/inspections/{inspection_id}', headers=headers)
                if poll_resp.status_code == 200:
                    data = poll_resp.json()
                    if data.get('status') in ['Completed', 'Failed']:
                        res_data = data
                        break
                time.sleep(1)
                
            latency = time.time() - start_time
            
            if res_data:
                prediction = res_data.get('inspection_result')
                defect_type = res_data.get('defect_type')
                conf = res_data.get('confidence')
                severity = res_data.get('severity_level')
                
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
                    'Category': cat,
                    'Image': filename,
                    'Ground Truth': ground_truth.upper(),
                    'Prediction': prediction,
                    'Defect Type': defect_type,
                    'Confidence': conf,
                    'Severity': severity,
                    'Processing Time (s)': round(latency, 2),
                    'Correct': is_correct,
                    'API Status': 200
                })
            else:
                print(f"Timeout polling {inspection_id}")

# Calculate Metrics
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

# Write CSV
os.makedirs(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../reports')), exist_ok=True)
csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../reports/milestone_4a_test_results.csv'))

with open(csv_path, 'w', newline='') as csvfile:
    fieldnames = ['Category', 'Image', 'Ground Truth', 'Prediction', 'Defect Type', 'Confidence', 'Severity', 'Processing Time (s)', 'Correct', 'API Status']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    for row in results:
        writer.writerow(row)
        
print(f'\nSaved results to {csv_path}')
