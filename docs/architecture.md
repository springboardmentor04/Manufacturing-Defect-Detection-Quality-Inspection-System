# VisionInspect AI — System Architecture & Design

## 1. Executive Architecture Overview

VisionInspect AI is an enterprise-grade automated surface defect inspection and quality intelligence platform engineered for modern manufacturing lines. The system unites high-throughput Computer Vision inference (YOLO defect localization coupled with multi-class feature extraction) and a deterministic manufacturing Quality Assessment Engine with full role-based production operations.

```mermaid
flowchart TD
    subgraph Edge_Manufacturing_Floor["Manufacturing Floor / Edge Layer"]
        CAM[Industrial High-Res Camera] -->|Raw Image Ingestion| UPLOAD[FastAPI Inspection Endpoint]
        OP[Factory Operator / Inspector] -->|Web UI Interaction| FE[Next.js 14 Frontend Web App]
    end

    subgraph Core_Backend_API["Backend Application Services (FastAPI)"]
        UPLOAD --> AUTH[JWT Authentication & RBAC]
        AUTH --> VAL[Image Validation & Quality Gate]
        VAL --> PIPELINE[Inference Pipeline Orchestrator]
        
        PIPELINE -->|Detections & Crops| ASSESS[Deterministic Quality Decision Engine]
        ASSESS -->|Calculates Severity & Risk| DECISION[4-State Quality Classifier]
        
        DECISION -->|PASS / FAIL / REVIEW / REWORK| PERSIST[PostgreSQL / SQLite Database]
        PERSIST --> METRICS[Quality Analytics Engine]
        METRICS --> REP[Executive Reporting Service]
    end

    subgraph ML_Inference_Layer["Machine Learning & Vision Subsystem"]
        PIPELINE --> YOLO[YOLO Defect Detector (best.pt)]
        YOLO --> NMS[IoU Non-Maximum Suppression]
        NMS --> CROP[Defect Region Cropper]
        CROP --> CLS[Multi-Category Classifier (ResNet/YOLO-cls)]
        CLS --> MAP[Class Mapping & Disambiguation Engine]
    end

    subgraph Data_Storage["Enterprise Data Layer"]
        PERSIST --> DB[(Relational DB: SQLAlchemy ORM)]
        PERSIST --> BLOB[Storage Volume: Raw & Processed Artifacts]
    end

    subgraph Dashboard_Presentation["Presentation & Analytics Layer"]
        FE --> DASH[Executive & Line Dashboards]
        FE --> INSP_VIEW[Inspection Explorer & Bounding Box Visualizer]
        FE --> OVERRIDE[Manual Review & Audit Trail]
        FE --> ANALYTICS[Defect Pareto & Statistical Quality Charts]
        FE --> EXPORT[CSV & Executive PDF Reports]
    end
```

---

## 2. Core Architectural Components

### 2.1 Edge Ingestion & API Layer (FastAPI)
- **Asynchronous Ingestion**: Multi-part image streams with parallel processing capabilities.
- **Image Quality Verification**: Validates file integrity, dimensions, brightness, contrast, and Laplacian sharpness before inference.
- **Role-Based Access Control**: Strict role hierarchy (`ADMIN`, `QUALITY_ENGINEER`, `SUPERVISOR`, `OPERATOR`) governing override and configuration permissions.

### 2.2 Deep Learning Vision Subsystem
- **Object Detection (YOLOv8)**: Real-time localization of defect regions with confidence scoring.
- **IoU Deduplication**: Non-maximum suppression eliminates bounding box overlap (`IoU >= 0.45`).
- **Defect Classifier & Semantic Resolver**: Resolves raw model classes to standardized manufacturing defect taxonomy via `class_mapping.json` (73 MVTec defect classes).

### 2.3 Quality Assessment & Decision Engine
- **Multi-Factor Severity Scoring**:
  $$\text{Severity} = (\text{Size} \times 0.30) + (\text{Location} \times 0.25) + (\text{Type} \times 0.25) + (\text{Confidence} \times 0.20)$$
- **Strict 4-State Quality Decision**: Deterministically routes each inspection into `PASS`, `FAIL`, `REVIEW`, or `REWORK`.
- **Decoupled Architecture**: Strictly separates Defect Type, Confidence %, Severity Score/Level, and Quality Decision.

### 2.4 Presentation & Analytics Layer (Next.js 14)
- **Unified Modern UI**: Built with Next.js 14, React 18, TailwindCSS, and Lucide icons.
- **Interactive Visual Inspection**: Canvas-based bounding box visualization with color-coded severity tags and defect overlays.
- **Quality Engineer & Supervisor Dashboards**: Tailored role-specific views with real-time KPI cards, defect Pareto charts, trend lines, and manual override capabilities.

---

## 3. High Availability & Scalability Architecture

1. **Stateless API Workers**: FastAPI runs with Gunicorn/Uvicorn worker pools, horizontally scalable behind reverse proxies (Nginx / Traefik / AWS ALB).
2. **GPU / CPU Inference Decoupling**: PyTorch / ONNX Runtime execution automatically leverages CUDA when available, with optimized CPU fallbacks.
3. **Database Concurrency**: SQLAlchemy connection pooling with transaction isolation for concurrent high-speed inspection logging.
4. **Audit Trail Immutability**: All manual decisions and threshold overrides generate audit records with timestamps and reviewer IDs.
