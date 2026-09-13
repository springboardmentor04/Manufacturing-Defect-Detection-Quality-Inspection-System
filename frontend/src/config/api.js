// Central API Base URL Configuration for Local & Vercel Environments
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// In local development, default to http://localhost:8000
// In Vercel production deployment, default to relative '' so requests hit Vercel Serverless Function on same domain
export const API_BASE_URL = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8000' : '');

export const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
export const REPORTS_API_URL = `${API_BASE_URL}/api/reports`;
export const MODEL_API_URL = `${API_BASE_URL}/api/model`;
