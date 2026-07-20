import { HttpClient } from "../client";
import { SigningUrlResult, ApiResponse } from "../types";

export class EmbedResource {
  constructor(private client: HttpClient) {}

  async getSigningUrl(params: {
    signer_id?: string;
    document_id?: string;
    signer_email?: string;
  }): Promise<SigningUrlResult> {
    const res = await this.client.post<ApiResponse<SigningUrlResult>>("/embed/signing-url", params);
    return res.data;
  }

  async getStatus(token: string): Promise<{
    signer_status: string;
    signed_at: string | null;
    document_status: string;
    document_title: string;
  }> {
    const res = await this.client.get<ApiResponse<{
      signer_status: string;
      signed_at: string | null;
      document_status: string;
      document_title: string;
    }>>(`/embed/status/${token}`);
    return res.data;
  }
}
