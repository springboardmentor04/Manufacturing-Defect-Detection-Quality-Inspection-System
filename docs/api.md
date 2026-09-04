# VisionInspect AI — REST API Documentation

VisionInspect AI provides an enterprise REST API built with FastAPI. All endpoints (except public authentication and healthcheck) require a Bearer JWT token in the `Authorization` header.

```
Authorization: Bearer <jwt_access_token>
```

---

## 1. System Health & Authentication

### `GET /health`
- **Description**: Lightweight health check endpoint for container orchestrators and load balancers.
- **Auth**: None
- **Response `200 OK`**:
```json
{
  "status": "ok"
}
```

### `POST /api/auth/token`
- **Description**: OAuth2 password grant login.
- **Request (Form Data)**: `username`, `password`
- **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### `POST /api/auth/mock-login`
- **Description**: Rapid development authentication helper.
- **Request Body**:
```json
{
  "username": "admin",
  "password": "password"
}
```

### `GET /api/auth/me`
- **Description**: Returns authenticated user profile and assigned role.
- **Response `200 OK`**:
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@visioninspect.ai",
  "full_name": "Quality Admin",
  "role": "ADMIN",
  "is_active": true
}
```

---

## 2. Inspections & Quality Decisions

### `POST /api/inspections/`
- **Description**: Uploads a component image, runs the deep learning detection pipeline, computes severity scoring, and yields a deterministic 4-state Quality Decision (`PASS`, `FAIL`, `REVIEW`, `REWORK`).
- **Request (Multipart/Form-Data)**:
  - `file`: Image binary (`image/png`, `image/jpeg`, `image/webp`)
  - `product_id`: Integer (Product identifier)
  - `batch_id`: Optional Integer (Production batch identifier)
- **Response `200 OK`**:
```json
{
  "id": 1042,
  "product_id": 1,
  "batch_id": 4,
  "image_path": "uploads/raw_sample_01.png",
  "processed_image_path": "uploads/processed_sample_01.jpg",
  "ai_status": "COMPLETED",
  "defect_type": "Broken Large",
  "confidence": 94.8,
  "severity_score": 88.5,
  "severity_level": "CRITICAL",
  "ai_decision": "FAIL",
  "human_decision": null,
  "final_decision": "FAIL",
  "override_reason": null,
  "processing_time_ms": 42.1,
  "created_at": "2026-09-03T12:00:00Z",
  "bounding_boxes": [
    {
      "box": [120, 80, 240, 210],
      "label": "broken_large",
      "defect_type": "broken_large",
      "defect_display_name": "Broken Large",
      "product_category": "bottle",
      "conf": 94.8,
      "area": 15600,
      "assessment": {
        "size_score": 75.0,
        "location_score": 85.0,
        "type_score": 95.0,
        "confidence_score": 94.8,
        "severity_score": 88.5,
        "severity_level": "CRITICAL",
        "quality_risk": "Critical risk",
        "quality_decision": "FAIL",
        "recommended_action": "Reject product immediately.",
        "manual_review_required": false
      }
    }
  ],
  "quality_assessment": {
    "overall_result": "FAIL",
    "highest_severity": "CRITICAL",
    "quality_risk": "Critical risk",
    "defect_count": 1,
    "recommended_action": "Reject product immediately.",
    "manual_review_required": false
  }
}
```

### `GET /api/inspections/{id}`
- **Description**: Retrieves detailed inspection record including defect coordinates, image quality metadata, and audit history.

### `POST /api/inspections/{id}/override`
- **Description**: Allows an authorized Quality Engineer or Supervisor to override an inspection decision. Must be strictly one of `PASS`, `FAIL`, `REVIEW`, `REWORK`.
- **Request Body**:
```json
{
  "final_decision": "REWORK",
  "override_reason": "Defect is a surface smudge that can be polished and cleaned on Line 2."
}
```
- **Response `200 OK`**: Returns updated inspection object with `human_decision` and audit trail entry.

---

## 3. Analytics & Manufacturing Intelligence

### `GET /api/analytics/overview?period=LAST_7_DAYS`
- **Parameters**: `period` (`TODAY`, `LAST_7_DAYS`, `LAST_30_DAYS`)
- **Response `200 OK`**:
```json
{
  "total_inspections": 1250,
  "total_defects": 142,
  "defect_rate": 11.36,
  "pass_rate": 88.64,
  "fail_rate": 6.80,
  "review_rate": 2.40,
  "rework_rate": 2.16,
  "average_severity": 44.2,
  "critical_defects": 18,
  "passed_inspections": 1108,
  "failed_inspections": 85,
  "review_inspections": 30,
  "rework_inspections": 27,
  "average_confidence": 91.4
}
```

### `GET /api/analytics/dashboard?period=LAST_7_DAYS`
- **Description**: Returns consolidated metrics for Quality Engineer and Supervisor dashboards including daily defect trends and category distributions.

---

## 4. Reporting Service

### `POST /api/reports/generate`
- **Description**: Generates an itemized CSV production quality report with executive KPI summary and per-inspection defect/severity/decision logs.
- **Request Body**:
```json
{
  "report_type": "DAILY_SUMMARY",
  "date_range": "LAST_7_DAYS"
}
```
- **Response `200 OK`**:
```json
{
  "id": 12,
  "report_type": "DAILY_SUMMARY",
  "date_range": "LAST_7_DAYS",
  "generated_by": 1,
  "file_path": "uploads/quality_report_ab3412cd.csv",
  "created_at": "2026-09-03T12:30:00Z"
}
```
