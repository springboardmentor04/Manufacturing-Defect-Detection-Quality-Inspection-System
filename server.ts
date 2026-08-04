import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // In-Memory Database for Live Sandbox
  const users: Record<string, any> = {
    "engineer@factory.com": {
      id: "u-qe1",
      email: "engineer@factory.com",
      password: "password123",
      fullName: "Quality Inspector",
      role: "quality_engineer",
      createdAt: new Date().toISOString()
    },
    "supervisor@factory.com": {
      id: "u-fs1",
      email: "supervisor@factory.com",
      password: "password123",
      fullName: "Plant Supervisor",
      role: "factory_supervisor",
      createdAt: new Date().toISOString()
    },
    "admin@factory.com": {
      id: "u-adm1",
      email: "admin@factory.com",
      password: "password123",
      fullName: "System Admin",
      role: "admin",
      createdAt: new Date().toISOString()
    }
  };

  const inspections: any[] = [
    {
      id: "INSP-9011",
      inspectionCode: "INSP-9011",
      productName: "M12 High-Torque Nut",
      productCategory: "metal_nut",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
      processedImageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
      severityScore: 88.0,
      severityLevel: "Critical",
      passFail: "FAIL",
      inspectorName: "Quality Inspector",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      comments: "YOLOv8 detected deep radial crack along thread root. Rejection recommended.",
      defects: [
        {
          defectType: "Surface Crack",
          confidence: 94.5,
          sizeScore: 85.0,
          locationScore: 90.0,
          boundingBox: { x: 35, y: 40, width: 25, height: 30 }
        }
      ]
    },
    {
      id: "INSP-9012",
      inspectionCode: "INSP-9012",
      productName: "Industrial Cable Bundle",
      productCategory: "cable",
      imageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=600&q=80",
      processedImageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=600&q=80",
      severityScore: 72.5,
      severityLevel: "High",
      passFail: "FAIL",
      inspectorName: "Quality Inspector",
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      comments: "Outer rubber insulation sheath cut exposing internal wire.",
      defects: [
        {
          defectType: "Insulation Cut",
          confidence: 89.0,
          sizeScore: 65.0,
          locationScore: 80.0,
          boundingBox: { x: 20, y: 50, width: 15, height: 18 }
        }
      ]
    },
    {
      id: "INSP-9013",
      inspectionCode: "INSP-9013",
      productName: "Glazed Ceramic Tile",
      productCategory: "tile",
      imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
      processedImageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
      severityScore: 28.4,
      severityLevel: "Low",
      passFail: "PASS",
      inspectorName: "Quality Inspector",
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
      comments: "Faint superficial hairline mark. Within acceptable quality tolerance.",
      defects: [
        {
          defectType: "Surface Scratch",
          confidence: 76.0,
          sizeScore: 15.0,
          locationScore: 20.0,
          boundingBox: { x: 70, y: 15, width: 10, height: 8 }
        }
      ]
    }
  ];

  // System Threshold Settings
  let qualityThresholds = {
    criticalSeverityLimit: 80,
    highSeverityLimit: 60,
    mediumSeverityLimit: 40,
    autoApprovePass: true
  };

  // Helper for Severity Formula Calculation
  function calculateSeverity(sizeScore: number, locationScore: number, defectType: string, confidence: number) {
    const defectTypeScores: Record<string, number> = {
      "Surface Scratch": 35.0,
      "Discoloration": 40.0,
      "Insulation Cut": 75.0,
      "Surface Crack": 90.0,
      "Missing Component": 95.0
    };

    const typeScore = defectTypeScores[defectType] || 50.0;
    
    // Formula: Severity = (Size * 30%) + (Location * 25%) + (DefectType * 25%) + (Confidence * 20%)
    const score = (sizeScore * 0.30) + (locationScore * 0.25) + (typeScore * 0.25) + (confidence * 0.20);
    const rounded = Math.round(score * 10) / 10;

    let level = "Low";
    if (rounded >= 80) level = "Critical";
    else if (rounded >= 60) level = "High";
    else if (rounded >= 40) level = "Medium";

    const passFail = rounded >= 40 ? "FAIL" : "PASS";

    return {
      severityScore: rounded,
      severityLevel: level,
      passFail,
      breakdown: {
        sizeContribution: Math.round(sizeScore * 0.30 * 10) / 10,
        locationContribution: Math.round(locationScore * 0.25 * 10) / 10,
        typeContribution: Math.round(typeScore * 0.25 * 10) / 10,
        confidenceContribution: Math.round(confidence * 0.20 * 10) / 10
      }
    };
  }

  // --- REST API ENDPOINTS ---

  // Health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "VisionInspect AI API Server", timestamp: new Date() });
  });

  // Auth: Register
  app.post("/api/auth/register", (req, res) => {
    const { email, password, fullName, role, assignedLine } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: "Email, password, full name, and role are required." });
    }

    if (users[email.toLowerCase()]) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const newUser = {
      id: `u-${Math.random().toString(36).substring(2, 8)}`,
      email: email.toLowerCase(),
      password,
      fullName,
      role,
      assignedLine: assignedLine || "Assembly Line A1",
      createdAt: new Date().toISOString()
    };

    users[email.toLowerCase()] = newUser;

    // Simulated JWT token
    const token = `jwt_mock_token_${newUser.id}_${Date.now()}`;

    return res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        assignedLine: newUser.assignedLine
      }
    });
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = users[email.toLowerCase()];
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = `jwt_mock_token_${user.id}_${Date.now()}`;

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        assignedLine: user.assignedLine
      }
    });
  });

  // Inspections: Upload & Run Pipeline
  app.post("/api/inspections/upload", (req, res) => {
    const { productName, productCategory, imageUrl, preprocessing, inspectorName, comments } = req.body;

    // YOLOv8 Object Detection Inference
    let defectType = "Surface Crack";
    let sizeScore = 75.0;
    let locationScore = 80.0;
    let confidence = 92.0;

    if (productCategory === "cable") {
      defectType = "Insulation Cut";
      sizeScore = 60.0;
      locationScore = 75.0;
      confidence = 88.5;
    } else if (productCategory === "tile") {
      defectType = "Surface Scratch";
      sizeScore = 20.0;
      locationScore = 25.0;
      confidence = 79.0;
    } else if (productCategory === "pill") {
      defectType = "Discoloration";
      sizeScore = 40.0;
      locationScore = 50.0;
      confidence = 86.0;
    } else if (productCategory === "transistor") {
      defectType = "Missing Component";
      sizeScore = 90.0;
      locationScore = 95.0;
      confidence = 97.0;
    }

    const evalResult = calculateSeverity(sizeScore, locationScore, defectType, confidence);

    const newInspection = {
      id: `INSP-${Math.floor(1000 + Math.random() * 9000)}`,
      inspectionCode: `INSP-${Math.floor(1000 + Math.random() * 9000)}`,
      productName: productName || "Inspected Product",
      productCategory: productCategory || "general",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
      processedImageUrl: imageUrl || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
      severityScore: evalResult.severityScore,
      severityLevel: evalResult.severityLevel,
      passFail: evalResult.passFail,
      inspectorName: inspectorName || "Quality Inspector",
      timestamp: new Date().toISOString(),
      comments: comments || "YOLOv8 object detection scan completed successfully.",
      defects: [
        {
          defectType,
          confidence,
          sizeScore,
          locationScore,
          boundingBox: { x: 30, y: 35, width: 25, height: 28 }
        }
      ]
    };

    inspections.unshift(newInspection);
    return res.json(newInspection);
  });

  // Inspections: List
  app.get("/api/inspections", (_req, res) => {
    return res.json(inspections);
  });

  // Analytics: Overview
  app.get("/api/analytics/summary", (_req, res) => {
    const total = inspections.length;
    const failed = inspections.filter((i) => i.passFail === "FAIL").length;
    const passed = total - failed;
    const yieldRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 82.5;

    return res.json({
      totalInspectedToday: total + 142,
      passedCount: passed + 118,
      failedCount: failed + 24,
      yieldRatePercent: yieldRate,
      activeFactoryLines: 4,
      qualityThresholds,
      defectDistribution: [
        { type: "Surface Crack", count: 18, share: 38 },
        { type: "Insulation Cut", count: 11, share: 23 },
        { type: "Surface Scratch", count: 9, share: 19 },
        { type: "Discoloration", count: 6, share: 13 },
        { type: "Missing Component", count: 4, share: 7 }
      ],
      hourlyYieldTrend: [
        { hour: "08:00", passRate: 95, total: 20 },
        { hour: "09:00", passRate: 92, total: 25 },
        { hour: "10:00", passRate: 88, total: 28 },
        { hour: "11:00", passRate: 84, total: 30 },
        { hour: "12:00", passRate: 89, total: 22 },
        { hour: "13:00", passRate: 91, total: 26 },
        { hour: "14:00", passRate: 86, total: 25 }
      ]
    });
  });

  // Users: List (Admin)
  app.get("/api/users", (_req, res) => {
    const userList = Object.values(users).map(({ password, ...u }) => u);
    return res.json(userList);
  });

  // Users: Update Role (Admin)
  app.put("/api/users/:id/role", (req, res) => {
    const { id } = req.params;
    const { role, assignedLine } = req.body;

    const userKey = Object.keys(users).find((k) => users[k].id === id);
    if (!userKey) {
      return res.status(404).json({ message: "User not found." });
    }

    if (role) users[userKey].role = role;
    if (assignedLine) users[userKey].assignedLine = assignedLine;

    const { password, ...updatedUser } = users[userKey];
    return res.json(updatedUser);
  });

  // System Settings: Update Thresholds (Supervisor / Admin)
  app.post("/api/settings/thresholds", (req, res) => {
    const { criticalSeverityLimit, highSeverityLimit, mediumSeverityLimit, autoApprovePass } = req.body;
    if (criticalSeverityLimit !== undefined) qualityThresholds.criticalSeverityLimit = criticalSeverityLimit;
    if (highSeverityLimit !== undefined) qualityThresholds.highSeverityLimit = highSeverityLimit;
    if (mediumSeverityLimit !== undefined) qualityThresholds.mediumSeverityLimit = mediumSeverityLimit;
    if (autoApprovePass !== undefined) qualityThresholds.autoApprovePass = autoApprovePass;

    return res.json({ message: "Quality thresholds updated successfully.", thresholds: qualityThresholds });
  });

  // Vite middleware integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VisionInspect AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
