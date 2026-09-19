/**
 * Centralized API base URL resolver.
 * Trims any accidental trailing slashes or /api/v1 suffix so endpoints are constructed consistently.
 */
export function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  // Remove trailing slash
  url = url.replace(/\/+$/, "");
  // If user included /api/v1 at the end of NEXT_PUBLIC_API_URL, strip it so `${url}/api/v1/...` works everywhere
  if (url.endsWith("/api/v1")) {
    url = url.slice(0, -"/api/v1".length);
  }
  return url;
}

export function getFullImageUrl(imagePath?: string): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const baseUrl = getApiBaseUrl();
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${baseUrl}${normalizedPath}`;
}
