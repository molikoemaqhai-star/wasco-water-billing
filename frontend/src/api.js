const API_BASE = "http://localhost:4000/api";
function buildHeaders(extra = {}) {
  const user = JSON.parse(localStorage.getItem("wasco-user") || "null");
  return {
    "Content-Type": "application/json",
    ...(user?.role ? { "x-user-role": user.role } : {}),
    ...(user?.user_id ? { "x-user-id": user.user_id } : {}),
    ...(user?.customer_id ? { "x-customer-id": user.customer_id } : {}),
    ...(user?.branch_id ? { "x-branch-id": user.branch_id } : {}),
    ...extra
  };
}
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(options.headers || {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" })
};
