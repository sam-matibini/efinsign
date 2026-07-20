import { HttpClient } from "../client";
import { Organization, Usage, ApiResponse } from "../types";

export class OrganizationResource {
  constructor(private client: HttpClient) {}

  async get(): Promise<Organization> {
    const res = await this.client.get<ApiResponse<Organization>>("/organization");
    return res.data;
  }

  async update(params: {
    name?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    email?: string;
    telephone?: string;
  }): Promise<Organization> {
    const res = await this.client.patch<ApiResponse<Organization>>("/organization", params);
    return res.data;
  }

  async usage(): Promise<Usage> {
    const res = await this.client.get<ApiResponse<Usage>>("/organization/usage");
    return res.data;
  }
}
