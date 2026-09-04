import { User, UserRole, InspectionRecord, AnalyticsSummary, PreprocessingOptions, Product } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

const authHeaders = (includeJson = false): HeadersInit => {
  const token = localStorage.getItem('visioninspect_token');
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return { ...(includeJson ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` };
};

const normalizeUser = (user: any): User => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name ?? user.fullName,
  role: user.role as UserRole,
  assignedLine: user.assigned_line ?? user.assignedLine
});

const normalizeProduct = (product: any): Product => ({
  id: product.id,
  productName: product.product_name ?? product.productName,
  productCode: product.product_code ?? product.productCode,
  category: product.category,
  manufacturer: product.manufacturer,
  factoryLine: product.factory_line ?? product.factoryLine,
  status: product.status ?? 'Active',
  createdAt: product.created_at ?? product.createdAt
});

const getErrorMessage = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({}));
  return body.detail || body.message || fallback;
};

const normalizeInspectionRecord = (item: any): InspectionRecord => {
  const required = ['id', 'inspection_code', 'product_id', 'product_name', 'product_category', 'factory_line', 'inspector_id', 'inspector_name', 'image_url', 'timestamp', 'severity_score', 'severity_level', 'pass_fail', 'defects', 'image_width', 'image_height', 'preprocessing_used', 'model', 'recommendation'];
  const missing = required.filter((field) => item[field] === undefined || item[field] === null);
  if (missing.length) throw new Error(`Inspection response is missing required fields: ${missing.join(', ')}`);
  return {
    id: item.id, inspectionCode: item.inspection_code, productId: item.product_id, productName: item.product_name,
    productCategory: item.product_category, factoryLine: item.factory_line, inspectorId: item.inspector_id,
    imageUrl: item.image_url, processedImageUrl: item.processed_image_url, severityScore: Number(item.severity_score),
    severityLevel: item.severity_level, passFail: item.pass_fail, inspectorName: item.inspector_name,
    timestamp: new Date(item.timestamp).toISOString(), imageWidth: Number(item.image_width), imageHeight: Number(item.image_height),
    preprocessingUsed: { noiseRemoval: item.preprocessing_used.noise_removal, claheContrast: item.preprocessing_used.clahe_contrast, edgeDetection: item.preprocessing_used.edge_detection, roiCrop: item.preprocessing_used.roi_crop },
    model: item.model, recommendation: item.recommendation, comments: item.comments,
    defects: item.defects.map((defect: any) => ({
      classId: Number(defect.class_id), className: defect.class_name, defectType: defect.defect_type,
      confidence: Number(defect.confidence), confidenceScore: Number(defect.confidence_score), sizeScore: Number(defect.size_score),
      locationScore: Number(defect.location_score), typeScore: Number(defect.type_score), severityScore: Number(defect.severity_score),
      pixelBoundingBox: defect.pixel_bounding_box, boundingBox: defect.bounding_box
    }))
  };
};

export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Invalid email or password'));
  }

  const body = await res.json();
  return { token: body.token ?? body.access_token, user: normalizeUser(body.user) };
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  assignedLine?: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      role,
      assigned_line: assignedLine
    })
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Failed to register account'));
  }

  const body = await res.json();
  return { token: body.token ?? body.access_token, user: normalizeUser(body.user) };
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to validate your session'));
  return normalizeUser(await res.json());
}

export async function uploadInspection(data: {
  productId: string;
  productName: string;
  productCategory: string;
  factoryLine: string;
  imageUrl: string;
  preprocessing: PreprocessingOptions;
  comments?: string;
}): Promise<InspectionRecord> {
  const payload = {
    product_id: data.productId,
    product_name: data.productName,
    product_category: data.productCategory,
    factory_line: data.factoryLine,
    image_url: data.imageUrl,
    preprocessing: {
      noise_removal: data.preprocessing.noiseRemoval,
      clahe_contrast: data.preprocessing.claheContrast,
      edge_detection: data.preprocessing.edgeDetection,
      roi_crop: data.preprocessing.roiCrop
    },
    comments: data.comments ?? ''
  };

  const res = await fetch(`${API_BASE}/inspections/upload`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Failed to run defect inspection pipeline'));
  }

  return normalizeInspectionRecord(await res.json());
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to fetch products'));
  return (await res.json()).map(normalizeProduct);
}

export async function createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST', headers: authHeaders(true),
    body: JSON.stringify({ product_name: product.productName, product_code: product.productCode, category: product.category, manufacturer: product.manufacturer, factory_line: product.factoryLine, status: product.status })
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to save product'));
  return normalizeProduct(await res.json());
}

export async function updateProduct(id: string, product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT', headers: authHeaders(true),
    body: JSON.stringify({ product_name: product.productName, product_code: product.productCode, category: product.category, manufacturer: product.manufacturer, factory_line: product.factoryLine, status: product.status })
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to update product'));
  return normalizeProduct(await res.json());
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to delete product'));
}

export async function fetchInspections(): Promise<InspectionRecord[]> {
  const res = await fetch(`${API_BASE}/inspections`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res, 'Failed to fetch inspection history'));
  }

  const body = await res.json();
  return Array.isArray(body) ? body.map(normalizeInspectionRecord) : [];
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/analytics/summary`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error('Failed to fetch manufacturing analytics summary');
  }
  const body = await res.json();
  return {
    totalInspectedToday: Number(body.total_inspected_today ?? body.totalInspectedToday ?? 0),
    passedCount: Number(body.passed_count ?? body.passedCount ?? 0),
    failedCount: Number(body.failed_count ?? body.failedCount ?? 0),
    yieldRatePercent: Number(body.yield_rate_percent ?? body.yieldRatePercent ?? 0),
    activeFactoryLines: Number(body.active_factory_lines ?? body.activeFactoryLines ?? 0),
    qualityThresholds: {
      criticalSeverityLimit: Number(body.quality_thresholds?.critical_severity_limit ?? body.qualityThresholds?.criticalSeverityLimit ?? 80),
      highSeverityLimit: Number(body.quality_thresholds?.high_severity_limit ?? body.qualityThresholds?.highSeverityLimit ?? 60),
      mediumSeverityLimit: Number(body.quality_thresholds?.medium_severity_limit ?? body.qualityThresholds?.mediumSeverityLimit ?? 40),
      autoApprovePass: Boolean(body.quality_thresholds?.auto_approve_pass ?? body.qualityThresholds?.autoApprovePass)
    },
    defectDistribution: body.defect_distribution ?? body.defectDistribution ?? [],
    hourlyYieldTrend: body.hourly_yield_trend ?? body.hourlyYieldTrend ?? []
  };
}

export async function fetchAnalyticsByLine(): Promise<Array<{ factory_line: string; total_inspections: number; passed: number; failed: number; pass_rate_percent: number }>> {
  const res = await fetch(`${API_BASE}/analytics/by-line`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error('Failed to fetch per-line analytics');
  }
  const body = await res.json();
  return Array.isArray(body) ? body.map((line: any) => ({
    factory_line: line.factory_line ?? line.factoryLine ?? 'Unknown',
    total_inspections: Number(line.total_inspections ?? line.totalInspections ?? 0),
    passed: Number(line.passed ?? 0),
    failed: Number(line.failed ?? 0),
    pass_rate_percent: Number(line.pass_rate_percent ?? line.passRatePercent ?? 0)
  })) : [];
}

export async function fetchUserList(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error('Failed to fetch system users');
  }
  return (await res.json()).map(normalizeUser);
}

export async function updateUserRole(id: string, role: UserRole, assignedLine?: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}/role`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify({ role, assigned_line: assignedLine })
  });

  if (!res.ok) {
    throw new Error('Failed to update user role');
  }

  return normalizeUser(await res.json());
}
