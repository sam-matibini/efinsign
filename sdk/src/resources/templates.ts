import { HttpClient } from "../client";
import { Template, PaginatedResponse, Document, ApiResponse } from "../types";

export class TemplatesResource {
  constructor(private client: HttpClient) {}

  async create(params: {
    title: string;
    description?: string;
    signers?: Record<string, unknown>[];
    fields?: Record<string, unknown>[];
    tags?: string[];
    file?: Uint8Array | File;
  }): Promise<Template> {
    if (params.file) {
      const formData = new FormData();
      const blob = params.file instanceof File
        ? params.file
        : new Blob([params.file as BlobPart], { type: "application/pdf" });
      formData.append("file", blob, "template.pdf");
      formData.append("title", params.title);
      if (params.description) formData.append("description", params.description);
      if (params.signers) formData.append("signers", JSON.stringify(params.signers));
      if (params.fields) formData.append("fields", JSON.stringify(params.fields));
      if (params.tags) formData.append("tags", JSON.stringify(params.tags));

      const res = await this.client.postFormData<ApiResponse<Template>>("/templates", formData);
      return res.data;
    }

    const res = await this.client.post<ApiResponse<Template>>("/templates", params);
    return res.data;
  }

  async list(params?: { search?: string; page?: number; per_page?: number }): Promise<PaginatedResponse<Template>> {
    return this.client.get<PaginatedResponse<Template>>("/templates", params as Record<string, unknown>);
  }

  async get(id: string): Promise<Template> {
    const res = await this.client.get<ApiResponse<Template>>(`/templates/${id}`);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(`/templates/${id}`);
  }

  async createDocument(templateId: string, params?: { title?: string }): Promise<Document> {
    const res = await this.client.post<ApiResponse<Document>>(`/templates/${templateId}/documents`, params);
    return res.data;
  }
}
