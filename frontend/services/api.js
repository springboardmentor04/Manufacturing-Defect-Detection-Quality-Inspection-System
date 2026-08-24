const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(
  path,
  { method = "GET", body, headers = {}, auth = true } = {}
) {
  const token = auth ? localStorage.getItem("vi_token") : null;

  const requestHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  // Only set Content-Type for JSON requests
  if (!(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body:
      body instanceof FormData
        ? body
        : body
        ? JSON.stringify(body)
        : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      typeof errBody.detail === "string"
        ? errBody.detail
        : JSON.stringify(errBody.detail || errBody)
    );
  }

  if (res.status === 204) return null;

  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) =>
    request(path, { method: "POST", body, ...opts }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};