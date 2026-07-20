import { ApiResponse, eFinSignError } from "./types";

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

const DEFAULT_BASE_URL = "https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api";

export class HttpClient {
  apiKey: string;
  baseUrl: string;
  timeout: number;

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config.timeout || 30000;
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        const err = data?.error || {};
        throw new eFinSignError(response.status, err.code || "unknown", err.message || "Request failed");
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof eFinSignError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new eFinSignError(408, "timeout", "Request timed out");
      }
      throw new eFinSignError(0, "network_error", err instanceof Error ? err.message : "Network error");
    }
  }

  async request<T>(method: string, path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path, params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(url, {
        method,
        headers: body ? headers : { Authorization: headers.Authorization },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 204) {
        return undefined as T;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/pdf")) {
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer) as unknown as T;
      }

      const data = await response.json();

      if (!response.ok) {
        const err = data?.error || {};
        throw new eFinSignError(response.status, err.code || "unknown", err.message || "Request failed");
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof eFinSignError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new eFinSignError(408, "timeout", "Request timed out");
      }
      throw new eFinSignError(0, "network_error", err instanceof Error ? err.message : "Network error");
    }
  }
}
