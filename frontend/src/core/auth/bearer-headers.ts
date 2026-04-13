/** Same storage key as `useAuth` / gateway `get_current_user` (Bearer token). */
const TOKEN_STORAGE_KEY = "deerflow_token";

/** Headers for authenticated Gateway fetches from the browser. */
export function bearerAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
