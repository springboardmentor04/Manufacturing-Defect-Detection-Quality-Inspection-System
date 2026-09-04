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
      required: ["id", "inspection_code", "product_id", "product_name", "image_url", "severity_score", "severity_level", "pass_fail", "inspector_id", "inspector_name", "timestamp", "preprocessing_used", "model", "image_width", "image_height", "recommendation"],
      properties: {
        _id: { bsonType: "objectId" },
        inspection_code: { bsonType: "string" },
        id: { bsonType: "string" },
        product_id: { bsonType: "string" },
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
        defects: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["class_id", "class_name", "defect_type", "confidence", "confidence_score", "size_score", "location_score", "type_score", "severity_score", "pixel_bounding_box", "bounding_box"],
            properties: {
              class_id: { bsonType: "int" },
              class_name: { bsonType: "string" },
              defect_type: { bsonType: "string" },
              confidence: { bsonType: "double" },
              confidence_score: { bsonType: "double" },
              size_score: { bsonType: "double" },
              location_score: { bsonType: "double" },
              type_score: { bsonType: "double" },
              severity_score: { bsonType: "double" },
              pixel_bounding_box: {
                bsonType: "object",
                required: ["x1", "y1", "x2", "y2"],
                properties: { x1: { bsonType: "double" }, y1: { bsonType: "double" }, x2: { bsonType: "double" }, y2: { bsonType: "double" } }
              },
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
        image_width: { bsonType: "int" },
        image_height: { bsonType: "int" },
        model: { bsonType: "object" },
        recommendation: { bsonType: "string" },
        timestamp: { bsonType: "date" }
      }
    }
  }
});

db.inspections.createIndex({ "timestamp": -1 });
db.inspections.createIndex({ "factory_line": 1 });
db.inspections.createIndex({ "pass_fail": 1 });
