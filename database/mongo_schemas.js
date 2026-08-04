/**
 * MongoDB Collection Schemas & Validation Rules for VisionInspect AI
 */

// Users Collection Schema
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password_hash", "full_name", "role", "created_at"],
      properties: {
        _id: { bsonType: "objectId" },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Unique user email address"
        },
        password_hash: { bsonType: "string" },
        full_name: { bsonType: "string" },
        role: {
          enum: ["quality_engineer", "factory_supervisor", "admin"],
          description: "Role-based access level"
        },
        assigned_line: { bsonType: "string" },
        created_at: { bsonType: "date" },
        last_login: { bsonType: "date" }
      }
    }
  }
});

db.users.createIndex({ "email": 1 }, { unique: true });

// Inspections Collection Schema
db.createCollection("inspections", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_name", "image_url", "severity_score", "severity_level", "pass_fail", "inspector_id", "timestamp"],
      properties: {
        _id: { bsonType: "objectId" },
        inspection_code: { bsonType: "string" },
        product_name: { bsonType: "string" },
        product_category: { bsonType: "string" },
        factory_line: { bsonType: "string" },
        image_url: { bsonType: "string" },
        processed_image_url: { bsonType: "string" },
        preprocessing_used: {
          bsonType: "object",
          properties: {
            noise_removal: { bsonType: "bool" },
            clahe_contrast: { bsonType: "bool" },
            edge_detection: { bsonType: "bool" },
            roi_crop: { bsonType: "bool" }
          }
        },
        defects_detected: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["defect_type", "confidence", "bounding_box"],
            properties: {
              defect_type: { bsonType: "string" },
              confidence: { bsonType: "double" },
              size_score: { bsonType: "double" },
              location_score: { bsonType: "double" },
              bounding_box: {
                bsonType: "object",
                properties: {
                  x: { bsonType: "double" },
                  y: { bsonType: "double" },
                  width: { bsonType: "double" },
                  height: { bsonType: "double" }
                }
              }
            }
          }
        },
        severity_score: { bsonType: "double" },
        severity_level: { enum: ["Low", "Medium", "High", "Critical"] },
        pass_fail: { enum: ["PASS", "FAIL"] },
        inspector_id: { bsonType: "string" },
        inspector_name: { bsonType: "string" },
        comments: { bsonType: "string" },
        timestamp: { bsonType: "date" }
      }
    }
  }
});

db.inspections.createIndex({ "timestamp": -1 });
db.inspections.createIndex({ "factory_line": 1 });
db.inspections.createIndex({ "pass_fail": 1 });
