import { User, UserRole, InspectionRecord, AnalyticsSummary, PreprocessingOptions } from '../types';

const API_BASE = '/api';

export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(err.message || 'Invalid email or password');
  }

  return res.json();
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
    body: JSON.stringify({ email, password, fullName, role, assignedLine })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(err.message || 'Failed to register account');
  }

  return res.json();
}

export async function uploadInspection(data: {
  productName: string;
  productCategory: string;
  factoryLine: string;
  imageUrl: string;
  preprocessing: PreprocessingOptions;
  comments?: string;
}): Promise<InspectionRecord> {
  const res = await fetch(`${API_BASE}/inspections/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error('Failed to run defect inspection pipeline');
  }

  return res.json();
}

export async function fetchInspections(): Promise<InspectionRecord[]> {
  const res = await fetch(`${API_BASE}/inspections`);
  if (!res.ok) {
    throw new Error('Failed to fetch inspection history');
  }
  return res.json();
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) {
    throw new Error('Failed to fetch manufacturing analytics summary');
  }
  return res.json();
}

export async function fetchUserList(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) {
    throw new Error('Failed to fetch system users');
  }
  return res.json();
}

export async function updateUserRole(id: string, role: UserRole, assignedLine?: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, assignedLine })
  });

  if (!res.ok) {
    throw new Error('Failed to update user role');
  }

  return res.json();
}
