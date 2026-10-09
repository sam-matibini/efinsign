import { HttpClient } from "../client";
import {
  Document, DocumentDetail, PaginatedResponse, ApiResponse,
} from "../types";

export class DocumentsResource {
  constructor(private client: HttpClient) {}

  async create(params: { file: Uint8Array | File; title: string; fileName?: string }): Promise<Document> {
    const formData = new FormData();
    const blob = params.file instanceof File
      ? params.file
      : new Blob([params.file as BlobPart], { type: "application/pdf" });
    formData.append("file", blob, params.fileName || "document.pdf");
    formData.append("title", params.title);

    const res = await this.client.postFormData<ApiResponse<Document>>("/documents", formData);
    return res.data;
  }

  async list(params?: {
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<PaginatedResponse<Document>> {
    return this.client.get<PaginatedResponse<Document>>("/documents", params as Record<string, unknown>);
  }

  async get(id: string): Promise<DocumentDetail> {
    const res = await this.client.get<ApiResponse<DocumentDetail>>(`/documents/${id}`);
    return res.data;
  }

  async update(id: string, params: { title?: string }): Promise<Document> {
    const res = await this.client.patch<ApiResponse<Document>>(`/documents/${id}`, params);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(`/documents/${id}`);
  }

  async download(id: string, type: "original" | "signed" = "original"): Promise<Uint8Array> {
    return this.client.get<Uint8Array>(`/documents/${id}/download`, { type });
  }

  async auditLog(id: string) {
    return this.client.get(`/documents/${id}/audit-log`);
  }

  async send(id: string): Promise<Document> {
    const res = await this.client.post<ApiResponse<Document>>(`/documents/${id}/send`);
    return res.data;
  }

  async void(id: string): Promise<{ success: boolean; status: string }> {
    const res = await this.client.post<ApiResponse<{ success: boolean; status: string }>>(`/documents/${id}/void`);
    return res.data;
  }

  async remind(id: string): Promise<{ success: boolean; sandbox: boolean; message: string }> {
    const res = await this.client.post<ApiResponse<{ success: boolean; sandbox: boolean; message: string }>>(`/documents/${id}/remind`);
    return res.data;
  }
}
