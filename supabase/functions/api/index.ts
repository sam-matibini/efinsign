import { corsHeaders, corsPreflight, jsonResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { handleError, errorResponse } from "../_shared/errors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { Router } from "../_shared/router.ts";

import {
  createDocument, listDocuments, getDocument, updateDocument,
  deleteDocument, downloadDocument, getAuditLog, sendDocument,
  voidDocument, remindDocument,
} from "../_shared/handlers/documents.ts";

import {
  addSigner, listSigners, updateSigner, removeSigner,
  addField, updateField, removeField,
} from "../_shared/handlers/signers.ts";

import {
  createTemplate, listTemplates, getTemplate, deleteTemplate,
  createDocumentFromTemplate,
} from "../_shared/handlers/templates.ts";

import { getSigningUrl, getSigningStatus } from "../_shared/handlers/embed.ts";
import { getOrganization, updateOrganization, getUsage } from "../_shared/handlers/organization.ts";
import {
  createClient_ as createClientRecord, listClients, getClient,
  updateClient, deleteClient,
} from "../_shared/handlers/clients.ts";

import {
  createWebhook, listWebhooks, deleteWebhook, testWebhook,
} from "../_shared/handlers/webhooks.ts";

import { openapiSpec } from "../_shared/openapi.ts";

const router = new Router();

// ─── Documents ───────────────────────────────────
router.post  ("/documents",                                    createDocument);
router.get   ("/documents",                                    listDocuments);
router.get   ("/documents/:id",                                getDocument);
router.patch ("/documents/:id",                                updateDocument);
router.delete("/documents/:id",                                deleteDocument);
router.get   ("/documents/:id/download",                       downloadDocument);
router.get   ("/documents/:id/audit-log",                      getAuditLog);
router.post  ("/documents/:id/send",                           sendDocument);
router.post  ("/documents/:id/void",                           voidDocument);
router.post  ("/documents/:id/remind",                         remindDocument);

// ─── Signers ──────────────────────────────────────
router.post  ("/documents/:id/signers",                        addSigner);
router.get   ("/documents/:id/signers",                        listSigners);
router.patch ("/documents/:id/signers/:signerId",              updateSigner);
router.delete("/documents/:id/signers/:signerId",              removeSigner);

// ─── Fields ───────────────────────────────────────
router.post  ("/documents/:id/signers/:signerId/fields",       addField);
router.patch ("/documents/:id/signers/:signerId/fields/:fieldId", updateField);
router.delete("/documents/:id/signers/:signerId/fields/:fieldId", removeField);

// ─── Templates ────────────────────────────────────
router.post  ("/templates",                                    createTemplate);
router.get   ("/templates",                                    listTemplates);
router.get   ("/templates/:id",                                getTemplate);
router.delete("/templates/:id",                                deleteTemplate);
router.post  ("/templates/:id/documents",                      createDocumentFromTemplate);

// ─── Embed ────────────────────────────────────────
router.post  ("/embed/signing-url",                            getSigningUrl);
router.get   ("/embed/status/:token",                          getSigningStatus);

// ─── Organization ─────────────────────────────────
router.get   ("/organization",                                 getOrganization);
router.patch ("/organization",                                 updateOrganization);
router.get   ("/organization/usage",                           getUsage);

// ─── Clients ──────────────────────────────────────
router.post  ("/clients",                                      createClientRecord);
router.get   ("/clients",                                      listClients);
router.get   ("/clients/:id",                                  getClient);
router.patch ("/clients/:id",                                  updateClient);
router.delete("/clients/:id",                                  deleteClient);

// ─── Webhooks ─────────────────────────────────────
router.post  ("/webhooks",                                     createWebhook);
router.get   ("/webhooks",                                     listWebhooks);
router.delete ("/webhooks/:id",                                deleteWebhook);
router.post  ("/webhooks/:id/test",                            testWebhook);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Extract path after /api (the function name)
    const apiIndex = pathname.indexOf("/api");
    if (apiIndex === -1) {
      return jsonResponse({
        name: "eFinSign API",
        version: "1.0.0",
        docs: "https://efinsign.ca/developers",
        status: "operational",
      });
    }

    let routePath = pathname.slice(apiIndex + 4); // remove "/api"
    if (!routePath) routePath = "/";

    // ── Health check (no auth) ──
    if (routePath === "/" || routePath === "/status") {
      return jsonResponse({
        name: "eFinSign API",
        version: "1.0.0",
        docs: "https://efinsign.ca/developers",
        status: "operational",
        timestamp: new Date().toISOString(),
      });
    }

    // ── OpenAPI spec (no auth) ──
    if (routePath === "/openapi.json" || routePath === "/openapi.yaml") {
      return new Response(JSON.stringify(openapiSpec), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // ── Authenticate ──
    let auth: { organization_id: string; mode: string; scopes: string[]; key_id: string };
    try {
      auth = await validateApiKey(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      return errorResponse(401, "unauthorized", message);
    }

    // ── Rate limit ──
    if (!checkRateLimit(auth.key_id, 1000)) {
      return errorResponse(429, "rate_limited", "Too many requests. Please slow down.");
    }

    // ── Route ──
    const match = router.match(req.method, routePath);
    if (!match) {
      return errorResponse(404, "not_found", `No route for ${req.method} ${routePath}`);
    }

    return await match.handler(req, match.params, {
      organization_id: auth.organization_id,
      mode: auth.mode,
      key_id: auth.key_id,
    });
  } catch (err) {
    return handleError(err);
  }
});
