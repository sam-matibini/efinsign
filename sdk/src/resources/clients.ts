import { HttpClient } from "../client";
import { Client, ClientInput, PaginatedResponse, ApiResponse } from "../types";

export class ClientsResource {
  constructor(private client: HttpClient) {}

  async create(params: ClientInput): Promise<Client> {
    const res = await this.client.post<ApiResponse<Client>>("/clients", params);
    return res.data;
  }

  async list(params?: { search?: string; page?: number; per_page?: number }): Promise<PaginatedResponse<Client>> {
    return this.client.get<PaginatedResponse<Client>>("/clients", params as Record<string, unknown>);
  }

  async get(id: string): Promise<Client> {
    const res = await this.client.get<ApiResponse<Client>>(`/clients/${id}`);
    return res.data;
  }

  async update(id: string, params: Partial<ClientInput>): Promise<Client> {
    const res = await this.client.patch<ApiResponse<Client>>(`/clients/${id}`, params);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(`/clients/${id}`);
  }
}
