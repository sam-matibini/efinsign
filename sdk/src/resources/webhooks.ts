import { HttpClient } from "../client";
import { Webhook, WebhookCreated, ApiResponse } from "../types";

export class WebhooksResource {
  constructor(private client: HttpClient) {}

  async create(params: { url: string; events: string[] }): Promise<WebhookCreated> {
    const res = await this.client.post<ApiResponse<WebhookCreated>>("/webhooks", params);
    return res.data;
  }

  async list(): Promise<Webhook[]> {
    const res = await this.client.get<ApiResponse<Webhook[]>>("/webhooks");
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(`/webhooks/${id}`);
  }

  async test(id: string): Promise<{ success: boolean; message: string }> {
    const res = await this.client.post<ApiResponse<{ success: boolean; message: string }>>(`/webhooks/${id}/test`);
    return res.data;
  }

  async verify(params: {
    payload: string | Record<string, unknown>;
    signature: string;
    secret: string;
    tolerance?: number;
  }): Promise<boolean> {
    const tolerance = params.tolerance ?? 300;

    const parts: Record<string, string> = {};
    params.signature.split(",").forEach((part) => {
      const [k, v] = part.split("=");
      parts[k] = v;
    });

    const timestamp = parseInt(parts.t || "0");
    if (!timestamp || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance) {
      return false;
    }

    const payloadStr = typeof params.payload === "string"
      ? params.payload
      : JSON.stringify(params.payload);

    const signedPayload = `${timestamp}.${payloadStr}`;
    const expected = parts.v1 || "";

    if (typeof crypto !== "undefined" && crypto.subtle) {
      return await this.verifyBrowser(signedPayload, expected, params.secret);
    }

    return this.verifyNode(signedPayload, expected, params.secret);
  }

  private async verifyBrowser(signedPayload: string, expected: string, secret: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );

    const sigBytes = new Uint8Array(expected.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    try {
      return await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, messageData);
    } catch {
      return false;
    }
  }

  private verifyNode(signedPayload: string, expected: string, secret: string): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require("crypto");
      const computed = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
