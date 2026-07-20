export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "eFinSign API",
    version: "1.0.0",
    description:
      "Programmatic access to eFinSign's e-signature platform. Create documents, add signers, send for signing, and track completion — all via REST.\n\n" +
      "## Authentication\n" +
      "All endpoints (except `/status` and `/`) require an API key passed as a Bearer token:\n" +
      "```\nAuthorization: Bearer efsk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n```\n\n" +
      "## Environments\n" +
      "| Mode | Key Prefix | Emails | PDFs | Limit |\n" +
      "|------|-----------|--------|------|-------|\n" +
      "| Sandbox | `efsk_test_` | Not sent | Watermarked | 100 docs/mo, 60 req/min |\n" +
      "| Production | `efsk_live_` | Real (Resend) | Clean | Plan-based, 1000 req/min |\n\n" +
      "## Pagination\n" +
      "List endpoints support `?page=1&per_page=50`. Response includes `meta` with `total`, `total_pages`.\n\n" +
      "## Errors\n" +
      '```json\n{ "error": { "code": "not_found", "message": "Document not found" } }\n```',
    contact: { name: "eFinSign", url: "https://efinsign.ca", email: "hello@efinsign.ca" },
  },
  servers: [
    { url: "https://api.efinsign.ca/functions/v1/api", description: "Production (custom domain)" },
    { url: "https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api", description: "Production (direct Supabase)" },
  ],
  security: [{ ApiKeyAuth: [] }],
  tags: [
    { name: "Documents", description: "Create, manage, and send documents for signing" },
    { name: "Signers", description: "Manage signers and signature fields on documents" },
    { name: "Fields", description: "Place and manage form fields for signers" },
    { name: "Templates", description: "Reusable document templates" },
    { name: "Embed", description: "Embeddable signing widget integration" },
    { name: "Organization", description: "Organization profile and usage" },
    { name: "Clients", description: "Address book of contacts" },
    { name: "Meta", description: "Health check and API metadata" },
  ],
  paths: {
    "/": {
      get: {
        tags: ["Meta"],
        summary: "API information",
        security: [],
        responses: { "200": { description: "API metadata", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiInfo" } } } } },
      },
    },
    "/status": {
      get: {
        tags: ["Meta"],
        summary: "Health check",
        security: [],
        responses: { "200": { description: "Healthy", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiInfo" } } } } },
      },
    },
    "/documents": {
      post: {
        tags: ["Documents"],
        summary: "Upload and create a document",
        description: "Upload a PDF file and create a new draft document.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file", "title"],
                properties: {
                  file: { type: "string", format: "binary", description: "PDF file to upload" },
                  title: { type: "string", description: "Document title", example: "Service Agreement 2026" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Document created", content: { "application/json": { schema: { $ref: "#/components/schemas/DocumentResponse" } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      get: {
        tags: ["Documents"],
        summary: "List documents",
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PerPage" },
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "pending", "completed", "expired", "declined"] }, description: "Filter by document status" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by title (case-insensitive)" },
        ],
        responses: { "200": { description: "Paginated list", content: { "application/json": { schema: { $ref: "#/components/schemas/DocumentListResponse" } } } } },
      },
    },
    "/documents/{id}": {
      get: {
        tags: ["Documents"],
        summary: "Get a document",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        responses: {
          "200": { description: "Document with signers and fields", content: { "application/json": { schema: { $ref: "#/components/schemas/DocumentDetailResponse" } } } },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Documents"],
        summary: "Update a document",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" } } } } } },
        responses: { "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/DocumentResponse" } } } } },
      },
      delete: {
        tags: ["Documents"],
        summary: "Delete a document",
        description: "Only draft documents can be deleted.",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        responses: {
          "204": { description: "Deleted" },
          "400": { description: "Cannot delete non-draft", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/documents/{id}/download": {
      get: {
        tags: ["Documents"],
        summary: "Download a document PDF",
        parameters: [
          { $ref: "#/components/parameters/DocumentId" },
          { name: "type", in: "query", schema: { type: "string", enum: ["original", "signed"], default: "original" } },
        ],
        responses: { "200": { description: "PDF file", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } } },
      },
    },
    "/documents/{id}/audit-log": {
      get: {
        tags: ["Documents"],
        summary: "Get audit log",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        responses: { "200": { description: "Audit trail", content: { "application/json": { schema: { $ref: "#/components/schemas/AuditLogResponse" } } } } },
      },
    },
    "/documents/{id}/send": {
      post: {
        tags: ["Documents"],
        summary: "Send document for signing",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        responses: {
          "200": { description: "Sent", content: { "application/json": { schema: { $ref: "#/components/schemas/DocumentResponse" } } } },
          "400": { description: "No signers or invalid status", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/documents/{id}/void": {
      post: {
        tags: ["Documents"],
        summary: "Void a pending document",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        responses: { "200": { description: "Voided", content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", properties: { success: { type: "boolean" }, status: { type: "string" } } } } } } } } },
      },
    },
    "/documents/{id}/remind": {
      post: {
        tags: ["Documents"],
        summary: "Send reminder to pending signers",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        responses: { "200": { description: "Reminder sent", content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", properties: { success: { type: "boolean" }, sandbox: { type: "boolean" }, message: { type: "string" } } } } } } } } },
      },
    },
    "/documents/{id}/signers": {
      post: {
        tags: ["Signers"],
        summary: "Add a signer",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email"],
                properties: {
                  name: { type: "string", example: "John Doe" },
                  email: { type: "string", format: "email", example: "john@example.com" },
                  order: { type: "integer", description: "Signing order (0 = any order)", default: 0 },
                  fields: { type: "array", items: { $ref: "#/components/schemas/FieldInput" } },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Signer created", content: { "application/json": { schema: { $ref: "#/components/schemas/SignerResponse" } } } } },
      },
      get: {
        tags: ["Signers"],
        summary: "List signers",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }],
        responses: { "200": { description: "Signers with fields", content: { "application/json": { schema: { $ref: "#/components/schemas/SignerListResponse" } } } } },
      },
    },
    "/documents/{id}/signers/{signerId}": {
      patch: {
        tags: ["Signers"],
        summary: "Update a signer",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }, { $ref: "#/components/parameters/SignerId" }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string", format: "email" }, order: { type: "integer" } } } } } },
        responses: { "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/SignerResponse" } } } } },
      },
      delete: {
        tags: ["Signers"],
        summary: "Remove a signer",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }, { $ref: "#/components/parameters/SignerId" }],
        responses: { "204": { description: "Removed" } },
      },
    },
    "/documents/{id}/signers/{signerId}/fields": {
      post: {
        tags: ["Fields"],
        summary: "Add a field to a signer",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }, { $ref: "#/components/parameters/SignerId" }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FieldInput" } } } },
        responses: { "201": { description: "Field created", content: { "application/json": { schema: { $ref: "#/components/schemas/FieldResponse" } } } } },
      },
    },
    "/documents/{id}/signers/{signerId}/fields/{fieldId}": {
      patch: {
        tags: ["Fields"],
        summary: "Update a field",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }, { $ref: "#/components/parameters/SignerId" }, { $ref: "#/components/parameters/FieldId" }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/FieldUpdateInput" } } } },
        responses: { "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/FieldResponse" } } } } },
      },
      delete: {
        tags: ["Fields"],
        summary: "Remove a field",
        parameters: [{ $ref: "#/components/parameters/DocumentId" }, { $ref: "#/components/parameters/SignerId" }, { $ref: "#/components/parameters/FieldId" }],
        responses: { "204": { description: "Removed" } },
      },
    },
    "/templates": {
      post: {
        tags: ["Templates"],
        summary: "Create a template",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string", example: "NDA Template" },
                  description: { type: "string" },
                  signers: { type: "array", items: { type: "object" } },
                  fields: { type: "array", items: { type: "object" } },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Template created", content: { "application/json": { schema: { $ref: "#/components/schemas/TemplateResponse" } } } } },
      },
      get: {
        tags: ["Templates"],
        summary: "List templates",
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PerPage" },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Paginated list", content: { "application/json": { schema: { $ref: "#/components/schemas/TemplateListResponse" } } } } },
      },
    },
    "/templates/{id}": {
      get: {
        tags: ["Templates"],
        summary: "Get a template",
        parameters: [{ $ref: "#/components/parameters/TemplateId" }],
        responses: { "200": { description: "Template", content: { "application/json": { schema: { $ref: "#/components/schemas/TemplateResponse" } } } } },
      },
      delete: {
        tags: ["Templates"],
        summary: "Delete a template",
        parameters: [{ $ref: "#/components/parameters/TemplateId" }],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/templates/{id}/documents": {
      post: {
        tags: ["Templates"],
        summary: "Create document from template",
        parameters: [{ $ref: "#/components/parameters/TemplateId" }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { title: { type: "string", description: "Override title" } } } } } },
        responses: { "201": { description: "Document created", content: { "application/json": { schema: { $ref: "#/components/schemas/DocumentResponse" } } } } },
      },
    },
    "/embed/signing-url": {
      post: {
        tags: ["Embed"],
        summary: "Get embeddable signing URL",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  signer_id: { type: "string", format: "uuid" },
                  document_id: { type: "string", format: "uuid" },
                  signer_email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Signing URLs", content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", properties: { url: { type: "string" }, signing_url: { type: "string" }, embed_url: { type: "string" }, signer_email: { type: "string" }, signer_name: { type: "string" } } } } } } } } },
      },
    },
    "/embed/status/{token}": {
      get: {
        tags: ["Embed"],
        summary: "Get signing status by token",
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Status", content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", properties: { signer_status: { type: "string" }, signed_at: { type: "string" }, document_status: { type: "string" }, document_title: { type: "string" } } } } } } } } },
      },
    },
    "/organization": {
      get: {
        tags: ["Organization"],
        summary: "Get organization",
        responses: { "200": { description: "Organization", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationResponse" } } } } },
      },
      patch: {
        tags: ["Organization"],
        summary: "Update organization",
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationUpdateInput" } } } },
        responses: { "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/OrganizationResponse" } } } } },
      },
    },
    "/organization/usage": {
      get: {
        tags: ["Organization"],
        summary: "Get usage stats",
        responses: { "200": { description: "Usage", content: { "application/json": { schema: { type: "object", properties: { data: { type: "object", properties: { total_documents: { type: "integer" }, pending_documents: { type: "integer" }, api_calls: { type: "integer" }, api_call_limit: { type: "integer" } } } } } } } } },
      },
    },
    "/clients": {
      post: {
        tags: ["Clients"],
        summary: "Create a client",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ClientInput" } } } },
        responses: { "201": { description: "Client created", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientResponse" } } } } },
      },
      get: {
        tags: ["Clients"],
        summary: "List clients",
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PerPage" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search name, email, or company" },
        ],
        responses: { "200": { description: "Paginated list", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientListResponse" } } } } },
      },
    },
    "/clients/{id}": {
      get: {
        tags: ["Clients"],
        summary: "Get a client",
        parameters: [{ $ref: "#/components/parameters/ClientId" }],
        responses: { "200": { description: "Client", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientResponse" } } } } },
      },
      patch: {
        tags: ["Clients"],
        summary: "Update a client",
        parameters: [{ $ref: "#/components/parameters/ClientId" }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/ClientUpdateInput" } } } },
        responses: { "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientResponse" } } } } },
      },
      delete: {
        tags: ["Clients"],
        summary: "Delete a client",
        parameters: [{ $ref: "#/components/parameters/ClientId" }],
        responses: { "204": { description: "Deleted" } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key in format `efsk_test_xxx` (sandbox) or `efsk_live_xxx` (production). Generate keys from Settings → API Keys.",
      },
    },
    parameters: {
      DocumentId: { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      SignerId: { name: "signerId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      FieldId: { name: "fieldId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      TemplateId: { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ClientId: { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      Page: { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
      PerPage: { name: "per_page", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
    },
    schemas: {
      ApiInfo: { type: "object", properties: { name: { type: "string" }, version: { type: "string" }, docs: { type: "string" }, status: { type: "string" }, timestamp: { type: "string", format: "date-time" } } },
      Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } } },
      PaginationMeta: { type: "object", properties: { page: { type: "integer" }, per_page: { type: "integer" }, total: { type: "integer" }, total_pages: { type: "integer" } } },
      Document: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          status: { type: "string", enum: ["draft", "pending", "completed", "expired", "declined"] },
          file_path: { type: "string", nullable: true },
          signed_file_path: { type: "string", nullable: true },
          organization_id: { type: "string", format: "uuid" },
          owner_id: { type: "string", format: "uuid", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      DocumentResponse: { type: "object", properties: { data: { $ref: "#/components/schemas/Document" } } },
      DocumentDetail: { allOf: [{ $ref: "#/components/schemas/Document" }, { type: "object", properties: { signers: { type: "array", items: { $ref: "#/components/schemas/SignerWithFields" } }, fields: { type: "array", items: { $ref: "#/components/schemas/Field" } } } }] },
      DocumentDetailResponse: { type: "object", properties: { data: { $ref: "#/components/schemas/DocumentDetail" } } },
      DocumentListResponse: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Document" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } },
      AuditLogEntry: { type: "object", properties: { id: { type: "string", format: "uuid" }, document_id: { type: "string", format: "uuid" }, event_type: { type: "string" }, actor_email: { type: "string" }, actor_ip: { type: "string" }, details: { type: "object" }, created_at: { type: "string", format: "date-time" } } },
      AuditLogResponse: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/AuditLogEntry" } } } },
      Signer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          document_id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string" },
          signing_order: { type: "integer" },
          status: { type: "string", enum: ["pending", "viewed", "signed", "declined"] },
          color: { type: "string" },
          signed_at: { type: "string", format: "date-time", nullable: true },
          decline_reason: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      SignerWithFields: { allOf: [{ $ref: "#/components/schemas/Signer" }, { type: "object", properties: { fields: { type: "array", items: { $ref: "#/components/schemas/Field" } } } }] },
      SignerResponse: { type: "object", properties: { data: { $ref: "#/components/schemas/SignerWithFields" } } },
      SignerListResponse: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/SignerWithFields" } } } },
      Field: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          document_id: { type: "string", format: "uuid" },
          signer_id: { type: "string", format: "uuid" },
          field_type: { type: "string", enum: ["signature", "initials", "name", "date", "text", "checkbox", "checkmark", "full_name", "title"] },
          page_number: { type: "integer" },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          value: { type: "string", nullable: true },
          label: { type: "string", nullable: true },
        },
      },
      FieldInput: { type: "object", required: ["type"], properties: { type: { type: "string", enum: ["signature", "initials", "name", "date", "text", "checkbox", "checkmark", "full_name", "title"], default: "signature" }, page: { type: "integer", default: 1 }, x: { type: "number", default: 0 }, y: { type: "number", default: 0 }, w: { type: "number", default: 200 }, h: { type: "number", default: 50 }, label: { type: "string" } } },
      FieldUpdateInput: { type: "object", properties: { type: { type: "string" }, page: { type: "integer" }, x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" }, label: { type: "string" } } },
      FieldResponse: { type: "object", properties: { data: { $ref: "#/components/schemas/Field" } } },
      Template: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, description: { type: "string" }, file_path: { type: "string" }, signers: { type: "array", items: { type: "object" } }, fields: { type: "array", items: { type: "object" } }, tags: { type: "array", items: { type: "string" } }, created_at: { type: "string", format: "date-time" } } },
      TemplateResponse: { type: "object", properties: { data: { $ref: "#/components/schemas/Template" } } },
      TemplateListResponse: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Template" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } },
      Organization: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, address: { type: "string" }, city: { type: "string" }, postal_code: { type: "string" }, country: { type: "string" }, email: { type: "string" }, telephone: { type: "string" }, cell_number: { type: "string" }, logo_url: { type: "string" } } },
      OrganizationResponse: { type: "object", properties: { data: { $ref: "#/components/schemas/Organization" } } },
      OrganizationUpdateInput: { type: "object", properties: { name: { type: "string" }, address: { type: "string" }, city: { type: "string" }, postal_code: { type: "string" }, country: { type: "string" }, email: { type: "string" }, telephone: { type: "string" } } },
      Client: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, email: { type: "string" }, company: { type: "string" }, address: { type: "string" }, city: { type: "string" }, country: { type: "string" }, postal_code: { type: "string" }, created_at: { type: "string", format: "date-time" } } },
      ClientInput: { type: "object", required: ["name"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, company: { type: "string" }, address: { type: "string" }, city: { type: "string" }, country: { type: "string" }, postal_code: { type: "string" } } },
      ClientUpdateInput: { type: "object", properties: { name: { type: "string" }, email: { type: "string", format: "email" }, company: { type: "string" }, address: { type: "string" }, city: { type: "string" }, country: { type: "string" }, postal_code: { type: "string" } } },
      ClientResponse: { type: "object", properties: { data: { $ref: "#/components/schemas/Client" } } },
      ClientListResponse: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Client" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } },
    },
    responses: {
      BadRequest: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      Unauthorized: { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      NotFound: { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      RateLimited: { description: "Too many requests", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  },
};
