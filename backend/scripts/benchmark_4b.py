import os
import sys
import time
import glob
import statistics
import torch
from pymongo import MongoClient
from datetime import datetime

# Setup Paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai-model')))

from inference.yolo_infer import YOLOInferenceEngine

# Configuration
TEST_IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai-model/yolo/dataset/images/test'))
CATEGORIES = ['bottle', 'cable', 'capsule', 'carpet', 'screw', 'transistor']
MONGO_URI = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')

def get_test_files():
    files = []
    for cat in CATEGORIES:
        good = glob.glob(os.path.join(TEST_IMAGES_DIR, f'{cat}_*good*.png'))
        bad = [f for f in glob.glob(os.path.join(TEST_IMAGES_DIR, f'{cat}_*.png')) if 'good' not in f]
        if good: files.append((good[0], cat, 'good'))
        if bad: files.append((bad[0], cat, 'defective'))
    return files

def get_gpu_memory_mb():
    if torch.cuda.is_available():
        return torch.cuda.memory_allocated() / 1024**2
    return 0.0

def run_benchmark(phase_name: str):
    print(f"\n{'='*50}\nStarting Benchmark: {phase_name}\n{'='*50}")
    
    engine = YOLOInferenceEngine()
    client = MongoClient(MONGO_URI)
    db = client['visioninspect_db']
    
    test_files = get_test_files()
    if not test_files:
        print("No test files found!")
        return
        
    print(f"Loaded {len(test_files)} images for benchmark.")
    
    inference_times = []
    db_write_times = []
    total_latencies = []
    memory_usages = []
    
    metrics = {'TP': 0, 'TN': 0, 'FP': 0, 'FN': 0}
    
    # Warmup
    engine.infer(test_files[0][0], test_files[0][1])
    
    for filepath, cat, truth in test_files:
        torch.cuda.synchronize() if torch.cuda.is_available() else None
        
        # 1. Total Latency Start
        t_total_start = time.perf_counter()
        
        # 2. YOLO Inference
        mem_before = get_gpu_memory_mb()
        t_inf_start = time.perf_counter()
        result = engine.infer(filepath, category=cat)
        torch.cuda.synchronize() if torch.cuda.is_available() else None
        t_inf_end = time.perf_counter()
        mem_after = get_gpu_memory_mb()
        
        inference_time_ms = (t_inf_end - t_inf_start) * 1000
        inference_times.append(inference_time_ms)
        memory_usages.append(mem_after)
        
        # 3. Accuracy Eval
        prediction = result.get('prediction', 'PASS')
        if truth == 'good':
            if prediction == 'PASS': metrics['TN'] += 1
            else: metrics['FP'] += 1
        else:
            if prediction == 'FAIL': metrics['TP'] += 1
            else: metrics['FN'] += 1
            
        # 4. DB Write
        doc = {
            "inspection_id": f"BENCH-{int(time.time()*1000)}",
            "status": "Completed",
            "category": cat,
            "prediction": prediction,
            "timestamp": datetime.utcnow()
        }
        t_db_start = time.perf_counter()
        db.benchmark_inspections.insert_one(doc)
        t_db_end = time.perf_counter()
        db_write_times.append((t_db_end - t_db_start) * 1000)
        
        # Total End
        total_latencies.append((time.perf_counter() - t_total_start) * 1000)
        
    # Stats Calculation
    def print_stats(name, data):
        print(f"{name:20s}: Mean: {statistics.mean(data):.2f}ms | Median: {statistics.median(data):.2f}ms | Min: {min(data):.2f}ms | Max: {max(data):.2f}ms")
        
    print_stats("YOLO Inference", inference_times)
    print_stats("Database Write", db_write_times)
    print_stats("Total Latency", total_latencies)
    
    print(f"Max VRAM Usage: {max(memory_usages):.2f} MB")
    
    total = sum(metrics.values())
    accuracy = (metrics['TP'] + metrics['TN']) / total if total > 0 else 0
    fpr = metrics['FP'] / (metrics['FP'] + metrics['TN']) if (metrics['FP'] + metrics['TN']) > 0 else 0
    fnr = metrics['FN'] / (metrics['FN'] + metrics['TP']) if (metrics['FN'] + metrics['TP']) > 0 else 0
    
    print(f"Accuracy: {accuracy:.2%} | FPR: {fpr:.2%} | FNR: {fnr:.2%}")
    
    # Cleanup DB
    db.benchmark_inspections.drop()
    
    return {
        "Phase": phase_name,
        "YOLO_Mean_ms": statistics.mean(inference_times),
        "DB_Mean_ms": statistics.mean(db_write_times),
        "Total_Mean_ms": statistics.mean(total_latencies),
        "Max_VRAM_MB": max(memory_usages),
        "Accuracy": accuracy,
        "FPR": fpr,
        "FNR": fnr
    }

if __name__ == "__main__":
    phase = sys.argv[1] if len(sys.argv) > 1 else "Baseline"
    run_benchmark(phase)
