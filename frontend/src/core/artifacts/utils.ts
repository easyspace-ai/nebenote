import { getBackendBaseURL } from "../config";
import type { AgentThread } from "../threads";

const TOKEN_STORAGE_KEY = "deerflow_token";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getFilenameFromPath(path: string): string {
  const decodedPath = decodeURIComponent(path);
  const lastSegment = decodedPath.split("/").pop();
  return lastSegment && lastSegment.length > 0 ? lastSegment : "artifact";
}

/**
 * Build the `{path:path}` segment for Gateway `/api/threads/{id}/artifacts/{path}`.
 * Strips leading slashes, encodes each segment (Unicode filenames), and avoids
 * `.../artifactsmnt/...` when the stored path omits a leading `/`.
 */
export function encodeArtifactVirtualPathForUrl(filepath: string): string {
  const t = filepath.trim();
  if (t.startsWith("write-file:")) {
    return t;
  }
  const stripped = t.replace(/^\/+/, "");
  if (!stripped) return "";
  return stripped
    .split("/")
    .filter((s) => s.length > 0)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function parseFilenameFromDisposition(
  contentDisposition: string | null,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const normalMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return normalMatch?.[1] ?? fallback;
}

export async function fetchArtifactWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
  });
}

export async function downloadArtifactWithAuth({
  filepath,
  threadId,
  isMock = false,
}: {
  filepath: string;
  threadId: string;
  isMock?: boolean;
}) {
  const url = urlOfArtifact({ filepath, threadId, download: true, isMock });
  const response = await fetchArtifactWithAuth(url);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const filename = parseFilenameFromDisposition(
    response.headers.get("Content-Disposition"),
    getFilenameFromPath(filepath),
  );

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function urlOfArtifact({
  filepath,
  threadId,
  download = false,
  isMock = false,
}: {
  filepath: string;
  threadId: string;
  download?: boolean;
  isMock?: boolean;
}) {
  const pathPart = encodeArtifactVirtualPathForUrl(filepath);
  const suffix = pathPart ? `/${pathPart}` : "";
  const q = download ? "?download=true" : "";
  if (isMock) {
    return `${getBackendBaseURL()}/mock/api/threads/${threadId}/artifacts${suffix}${q}`;
  }
  return `${getBackendBaseURL()}/api/threads/${threadId}/artifacts${suffix}${q}`;
}

export function extractArtifactsFromThread(thread: AgentThread) {
  return thread.values.artifacts ?? [];
}

export function resolveArtifactURL(absolutePath: string, threadId: string) {
  const pathPart = encodeArtifactVirtualPathForUrl(absolutePath);
  const suffix = pathPart ? `/${pathPart}` : "";
  return `${getBackendBaseURL()}/api/threads/${threadId}/artifacts${suffix}`;
}
