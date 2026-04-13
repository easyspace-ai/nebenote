"use client";

import { getBackendBaseURL } from "../config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = getBackendBaseURL();
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("deerflow_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.detail ?? errorData.message ?? `HTTP ${response.status}`,
          response.status,
          errorData.code
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : "Network error"
      );
    }
  }

  // Auth endpoints
  async register(email: string, password: string) {
    return this.request<{ token: string; user: { id: string; email: string; created_at: string } }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: { id: string; email: string; created_at: string } }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  }

  async logout() {
    return this.request<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  }

  async getMe() {
    return this.request<{ id: string; email: string; created_at: string }>("/api/auth/me");
  }

  // Notebook endpoints (projects)
  async listNotebooks() {
    return this.request<{ notebooks: Notebook[] }>("/api/notebooks");
  }

  async createNotebook(data: { title: string; description?: string; tags?: string[] }) {
    return this.request<{ notebook: Notebook }>("/api/notebooks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getNotebook(id: string) {
    return this.request<{ notebook: Notebook }>(`/api/notebooks/${id}`);
  }

  async updateNotebook(id: string, data: { title?: string; description?: string; tags?: string[] }) {
    return this.request<{ notebook: Notebook }>(`/api/notebooks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteNotebook(id: string) {
    return this.request<{ success: boolean }>(`/api/notebooks/${id}`, {
      method: "DELETE",
    });
  }
}

// Types
export interface Notebook {
  notebook_id: string;
  owner_id?: string | null;
  title: string;
  description?: string;
  tags?: string[];
  created_at: string | number;
  updated_at: string | number;
  settings?: NotebookSettings;
}

export interface NotebookSettings {
  model?: string;
  system_prompt?: string;
  archived?: boolean;
}

// Create singleton instance
export const apiClient = new ApiClient();
