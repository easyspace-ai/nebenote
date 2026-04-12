export function getBackendBaseURL(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8001";
  }
  // Client-side: use relative URL if not explicitly configured
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (envUrl) return envUrl;
  // Use relative URL to go through nginx/rewrite
  return "";
}

export function getLangGraphBaseURL(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_LANGGRAPH_BASE_URL || "http://localhost:2024";
  }
  const envUrl = process.env.NEXT_PUBLIC_LANGGRAPH_BASE_URL;
  if (envUrl) return envUrl;
  return "/api/langgraph";
}
