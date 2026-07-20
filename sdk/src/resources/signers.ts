import { HttpClient } from "../client";
import { SignerWithFields, Field, FieldInput, ApiResponse } from "../types";

export class SignersResource {
  constructor(private client: HttpClient) {}

  async add(
    documentId: string,
    params: {
      name: string;
      email: string;
      order?: number;
      signing_order?: number;
      fields?: FieldInput[];
    },
  ): Promise<SignerWithFields> {
    const res = await this.client.post<ApiResponse<SignerWithFields>>(
      `/documents/${documentId}/signers`,
      params,
    );
    return res.data;
  }

  async list(documentId: string): Promise<SignerWithFields[]> {
    const res = await this.client.get<ApiResponse<SignerWithFields[]>>(
      `/documents/${documentId}/signers`,
    );
    return res.data;
  }

  async update(
    documentId: string,
    signerId: string,
    params: { name?: string; email?: string; order?: number },
  ): Promise<SignerWithFields> {
    const res = await this.client.patch<ApiResponse<SignerWithFields>>(
      `/documents/${documentId}/signers/${signerId}`,
      params,
    );
    return res.data;
  }

  async remove(documentId: string, signerId: string): Promise<void> {
    await this.client.delete(`/documents/${documentId}/signers/${signerId}`);
  }

  async addField(
    documentId: string,
    signerId: string,
    params: FieldInput,
  ): Promise<Field> {
    const res = await this.client.post<ApiResponse<Field>>(
      `/documents/${documentId}/signers/${signerId}/fields`,
      params,
    );
    return res.data;
  }

  async updateField(
    documentId: string,
    signerId: string,
    fieldId: string,
    params: Partial<FieldInput>,
  ): Promise<Field> {
    const res = await this.client.patch<ApiResponse<Field>>(
      `/documents/${documentId}/signers/${signerId}/fields/${fieldId}`,
      params,
    );
    return res.data;
  }

  async removeField(documentId: string, signerId: string, fieldId: string): Promise<void> {
    await this.client.delete(`/documents/${documentId}/signers/${signerId}/fields/${fieldId}`);
  }
}
