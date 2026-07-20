# eFinSign Public API — Strategic Master Plan v2

## Final Decisions

| Decision | Choice | Rationale |
|---|---|---|
| API Runtime | Supabase Edge Functions (Deno) | Co-located with DB, zero infra overhead |
| Docs Location | `developers.efinsign.ca` | Clean separation, professional, SEO-friendly |
| Embeddable Widget | Yes — iframe + PostMessage API | Key differentiator vs competitors |
| Client SDK | `@efinsign/api` — auto-generated from OpenAPI | Always in sync, typed, zero manual work |
| Free Tier | **Sandbox mode** (watermarked PDFs, no real emails, 100 docs/mo) | Safe testing without abuse vector |
| Production Tier | **Paid plans only** (real emails, no watermark, unlimited docs based on plan) | Revenue-aligned. Sandbox is the free tier. |
| Key Access | **Self-serve, instant** from Org Settings | Low friction developer experience |
| efinsuite Relation | **Independent, REST API** (not shared Supabase) | Decoupled architectures. eFinSign is a service efinsuite consumes. |

---

## efinsuite Integration Story (The North Star)

efinsuite is an accounting platform. Here's the exact signing flow it needs:

```
 ACCOUNTANT (in efinsuite)                EFINSIGN API                   CLIENT
 ─────────────────────────                ────────────                   ──────
 1. Creates invoice PDF
 2. Clicks "Send for Signature" ──────► POST /v1/documents
                                        (upload PDF, metadata)
                                     ◄── returns document { id, status: "draft" }

 3. Places signature fields ─────────► POST /v1/documents/:id/signers
    (signer: client@email.com)          (add signer with fields)
                                     ◄── returns signer { id, access_token }

 4. Sends for signing ───────────────► POST /v1/documents/:id/send
                                     ◄── status: "pending"
                                     ────► sends email to client ────►  Client receives email
                                                                        5. Clicks link, signs
                                                                        6. Submits signature

 7. Webhook fires ◄────────────────── POST to efinsuite webhook
    document.completed                  { event: "document.completed", document_id }

 8. Downloads signed PDF ────────────► GET /v1/documents/:id/download
                                     ◄── returns signed PDF bytes

 9. Stores signed PDF in efinsuite
    Marks invoice as "signed"
```

### Key Insight for efinsuite

Since you own both projects, give efinsuite a **privileged service account API key**:
- Full scopes (not limited like public sandbox keys)
- Higher rate limits
- But still goes through the same REST API — keeps them decoupled
- If efinsuite ever needs direct DB access, that's a future optimization (not needed now)

---

## Phase 0: Foundation — Sandbox & API Key System

### Database: `api_keys` table
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "efinsuite-production", "development"
  key_prefix TEXT NOT NULL,              -- first 8 chars: "efsk_Ab12..." shown in UI
  key_hash TEXT NOT NULL,                -- SHA-256 of full key
  mode TEXT NOT NULL DEFAULT 'sandbox',  -- 'sandbox' | 'production'
  scopes TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,         -- resets monthly
  usage_limit INTEGER DEFAULT 100,       -- sandbox: 100, production: depends on plan
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_api_keys_org ON api_keys(organization_id) WHERE revoked_at IS NULL;
```

### Key Format
```
Production:  efsk_live_A1b2C3d4E5f6G7h8I9j0...
Sandbox:     efsk_test_Z9y8X7w6V5u4T3s2R1q0...
```

### Sandbox Mode Behavior
| Feature | Sandbox | Production |
|---|---|---|
| Emails sent | **No** — logged only, available via API | Yes (Resend) |
| Signed PDFs | **Watermarked** "TEST DOCUMENT — NOT LEGALLY BINDING" | Clean |
| Document limit | 100 documents/month | Per plan (unlimited on top tiers) |
| API rate limit | 60 requests/minute | 1000 requests/minute |
| Upgrade path | Org admin clicks "Upgrade to Production" → Stripe checkout | — |

### Edge Functions in Phase 0
```
supabase/functions/
├── _shared/
│   ├── cors.ts           — CORS for all origins (API is cross-origin by nature)
│   ├── auth.ts           — extract + validate api key, return { org_id, mode, scopes }
│   ├── errors.ts         — consistent error responses
│   ├── pagination.ts     — page/per_page + Link header
│   └── rate-limit.ts     — in-memory counter per key (resets on deployment, good enough for v1)
├── api-keys/
│   ├── generate/         — POST: create new key, return full key ONCE
│   ├── list/             — GET: list keys (never return full key, only prefix)
│   ├── revoke/           — DELETE: revoke key
│   └── upgrade/          — POST: upgrade key from sandbox to production (checks subscription)
└── status/               — GET /v1/status — public health check
```

### UI: API Keys Tab in OrgSettings
- Generate sandbox key (instant)
- See list with: name, mode (sandbox/production badge), prefix, last used, usage count
- Revoke key
- "Upgrade to Production" button → Stripe checkout (if not already subscribed)

---

## Phase 1: Core REST API Endpoints

### Base URL
```
https://cavdivfhszrnhliyafze.supabase.co/functions/v1
```

### Every request includes
```
Authorization: Bearer efsk_test_xxx  (or efsk_live_xxx)
Content-Type: application/json
```

### Consistent Response Shapes

**Success (single):**
```json
{
  "data": { "id": "...", "title": "...", ... }
}
```

**Success (list):**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 243,
    "total_pages": 5
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "document_not_found",
    "message": "No document found with that ID",
    "details": {}
  }
}
```

**HTTP Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no body) |
| 400 | Bad request (validation) |
| 401 | Invalid/missing API key |
| 402 | Quota exceeded (sandbox limit or subscription issue) |
| 403 | Key lacks required scope |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Server error |

### Endpoint Matrix

#### 1. Status (no auth)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/status` | Health check. Returns version, uptime. |

#### 2. Documents
| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/v1/documents` | `documents:write` | Upload PDF + create document. Multipart: `file` + `title` + optional `signers[]` |
| `GET` | `/v1/documents` | `documents:read` | List. Filters: `?status=draft&search=contract&page=1&per_page=20` |
| `GET` | `/v1/documents/:id` | `documents:read` | Get document with signers, fields, status |
| `PATCH` | `/v1/documents/:id` | `documents:write` | Update title/metadata |
| `DELETE` | `/v1/documents/:id` | `documents:write` | Delete (only if draft) |
| `GET` | `/v1/documents/:id/download` | `documents:read` | Download PDF. Query: `?type=signed|original` |
| `GET` | `/v1/documents/:id/audit-log` | `documents:read` | Full audit trail |
| `POST` | `/v1/documents/:id/send` | `signing:send` | Send for signing (requires at least 1 signer) |
| `POST` | `/v1/documents/:id/void` | `signing:send` | Void pending document |
| `POST` | `/v1/documents/:id/remind` | `signing:send` | Remind all/specific pending signers |

#### 3. Signers (sub-resource of documents)
| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/v1/documents/:id/signers` | `signing:send` | Add signer: `{ name, email, order?, fields?: [...] }` |
| `GET` | `/v1/documents/:id/signers` | `documents:read` | List signers with statuses |
| `PATCH` | `/v1/documents/:id/signers/:sid` | `signing:send` | Update signer info |
| `DELETE` | `/v1/documents/:id/signers/:sid` | `signing:send` | Remove signer (before sending) |

#### 4. Fields (sub-resource of signers)
| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/v1/documents/:id/signers/:sid/fields` | `signing:send` | Add field: `{ type, page, x, y, w, h, label? }` |
| `PATCH` | `/v1/documents/:id/signers/:sid/fields/:fid` | `signing:send` | Move/resize field |
| `DELETE` | `/v1/documents/:id/signers/:sid/fields/:fid` | `signing:send` | Remove field |

#### 5. Templates
| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/v1/templates` | `documents:write` | Create from uploaded PDF + signers/fields JSON |
| `GET` | `/v1/templates` | `documents:read` | List templates |
| `GET` | `/v1/templates/:id` | `documents:read` | Get template definition |
| `DELETE` | `/v1/templates/:id` | `documents:write` | Delete template |
| `POST` | `/v1/templates/:id/documents` | `documents:write` | Instantiate document from template |

#### 6. Embed / Widget
| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/v1/embed/signing-url` | `signing:send` | Get iframe URL for a specific signer. Body: `{ document_id, signer_id }`. Returns `{ url }` |
| `GET` | `/v1/embed/status/:signer_token` | `signing:send` | Poll signing progress |

#### 7. Webhooks
| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/v1/webhooks` | `webhooks:manage` | Register: `{ url, events[], secret }` |
| `GET` | `/v1/webhooks` | `webhooks:manage` | List registered webhooks |
| `DELETE` | `/v1/webhooks/:id` | `webhooks:manage` | Delete webhook |
| `POST` | `/v1/webhooks/:id/test` | `webhooks:manage` | Fire test event |

#### 8. Organization
| Method | Path | Scope | Description |
|---|---|---|---|
| `GET` | `/v1/organization` | `org:read` | Current org profile |
| `PATCH` | `/v1/organization` | `org:write` | Update org details |
| `GET` | `/v1/organization/usage` | `org:read` | Current month's API usage stats |

#### 9. Clients (Address Book)
| Method | Path | Scope | Description |
|---|---|---|---|
| `POST` | `/v1/clients` | `clients:write` | Add client |
| `GET` | `/v1/clients` | `clients:read` | List clients |
| `GET` | `/v1/clients/:id` | `clients:read` | Get client |
| `PATCH` | `/v1/clients/:id` | `clients:write` | Update client |
| `DELETE` | `/v1/clients/:id` | `clients:write` | Delete client |

---

## Phase 2: Testing Strategy — How Developers Test the API

### Layer 1: Instant Sandbox (Zero Friction)
```
Developer signs up at efinsign.ca
→ Creates organization
→ Goes to Settings → API Keys
→ Clicks "Generate Sandbox Key"
→ Gets: efsk_test_xxx
→ Immediately usable. No approval. No credit card.
```

### Layer 2: Interactive API Explorer
On `developers.efinsign.ca`, Scalar UI provides:
- Browse all endpoints
- Paste sandbox key → "Authenticate"
- Fill request body → "Send"
- See real response from the sandbox environment
- Code snippets auto-generated (cURL, JS, Python)

### Layer 3: cURL Quickstart (on docs)
```bash
# 1. Create document
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/documents \
  -H "Authorization: Bearer efsk_test_xxx" \
  -F "file=@contract.pdf" \
  -F "title=Service Agreement"

# 2. Add signer with fields
curl -X POST .../v1/documents/doc_123/signers \
  -H "Authorization: Bearer efsk_test_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "fields": [
      {"type": "signature", "page": 1, "x": 100, "y": 500, "w": 200, "h": 50},
      {"type": "date", "page": 1, "x": 350, "y": 500, "w": 150, "h": 30}
    ]
  }'

# 3. Send for signing
curl -X POST .../v1/documents/doc_123/send \
  -H "Authorization: Bearer efsk_test_xxx"

# 4. Check status later
curl .../v1/documents/doc_123 \
  -H "Authorization: Bearer efsk_test_xxx"
```

### Layer 4: Postman Collection
- Pre-built collection with all endpoints
- Environment variables: `base_url`, `api_key`
- Pre-filled example bodies
- Published on Postman Public API Network

### Layer 5: Test Webhook Receiver
- Built into the dev portal: `developers.efinsign.ca/webhook-tester`
- Generates a unique temporary URL
- Shows incoming webhook payloads in real-time
- No external tool needed

### Layer 6: Sandbox Emails Dashboard
- Sandbox mode doesn't send real emails
- Instead, all "sent" emails appear in the API Keys tab: "Sandbox Email Log"
- Developer can see exactly what would be sent to signers
- Signs their own test docs using `/sign?token=xxx` links from the log

### Layer 7: SDK Test Harness
```typescript
// efinsuite developer testing
import { eFinSign } from '@efinsign/api';

const efi = new eFinSign({ apiKey: 'efsk_test_xxx', sandbox: true });

// Full flow test
const doc = await efi.documents.create({
  file: fs.readFileSync('./test-invoice.pdf'),
  title: 'Test Invoice #001'
});

await efi.signers.add(doc.id, {
  name: 'Test Client',
  email: 'dev@efinsuite.com',  // sandbox: no email actually sent
  fields: [{ type: 'signature', page: 1, x: 100, y: 500, w: 200, h: 50 }]
});

await efi.documents.send(doc.id);

// ... later, check webhook or poll
const updated = await efi.documents.get(doc.id);
console.log(updated.status); // "pending" → (sign) → "completed"
```

---

## Phase 3: Webhooks (REORDERED — Before Dev Portal)

Webhooks move to Phase 3 because they're critical for efinsuite integration. Without webhooks, efinsuite has to poll — which is terrible.

### Database
```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_attempt_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  attempted_at TIMESTAMPTZ DEFAULT now()
);
```

### Events
| Event | Payload |
|---|---|
| `document.sent` | `{ event, document_id, title, sent_at }` |
| `document.signer_viewed` | `{ event, document_id, signer_email, viewed_at }` |
| `document.signer_signed` | `{ event, document_id, signer_email, signed_at }` |
| `document.signer_declined` | `{ event, document_id, signer_email, reason, declined_at }` |
| `document.completed` | `{ event, document_id, title, completed_at, download_url }` |
| `document.voided` | `{ event, document_id, title, voided_at }` |

### Signature Verification
Every webhook POST includes:
```
X-Efinsign-Signature: t=1234567890,v1=HMAC_SHA256_HASH
```

efinsuite verifies:
```typescript
const isValid = efi.webhooks.verify({
  payload: req.body,
  signature: req.headers['x-efinsign-signature'],
  secret: process.env.EFINSIGN_WEBHOOK_SECRET,
  tolerance: 300 // 5 min
});
```

---

## Phase 4: OpenAPI Specification

Single source of truth: `openapi.yaml` at repo root.

It describes ALL endpoints from all phases. Served at `GET /v1/openapi.json`.

Drives:
- Documentation rendering (Scalar)
- SDK generation (@efinsign/api)
- Postman collection generation
- Validation tests (can test that implementations match spec)

---

## Phase 5: Developer Portal (`developers.efinsign.ca`)

### Stack: VitePress
- Markdown-native (easy to write, easy to maintain)
- Vue-powered (works in your ecosystem)
- Built-in search (no external dependency)
- Deploy to Vercel with the same config pattern

### Site Map
```
developers.efinsign.ca/
├── /                          Landing page with quick links
├── /quickstart                "Your first API call in 5 minutes"
├── /authentication            API keys, sandbox vs production, scopes
├── /concepts
│   ├── /documents             Document lifecycle
│   ├── /signers               Signer management
│   ├── /templates             Template reuse patterns
│   └── /webhooks              Event-driven integration
├── /api-reference             Scalar UI (full OpenAPI explorer)
├── /sdk                       @efinsign/api installation + examples
├── /embedding                 iframe widget guide
├── /guides
│   ├── /efinsuite             Dedicated guide for efinsuite integration
│   ├── /zapier                (future)
│   └── /make                  (future)
├── /sandbox                   How sandbox works, limits, upgrading
├── /webhook-tester            Live webhook payload viewer
└── /changelog                 Versioned API changes
```

---

## Phase 6: Embeddable Signing Widget

Already described. Key for efinsuite: they embed the signing iframe, get PostMessage events, and never redirect users away.

```
efinsuite App
┌──────────────────────────────┐
│  Invoice #001                │
│  Status: Awaiting Signature  │
│                              │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │   eFinSign Signing     │  │  ← iframe
│  │   Widget               │  │
│  │   [Signature Pad]      │  │
│  │   [Sign] [Decline]     │  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
│  ← PostMessage events        │
└──────────────────────────────┘
```

---

## Phase 7: Client SDK (`@efinsign/api`)

Generated from `openapi.yaml` using `@hey-api/openapi-ts`.

### Installation
```bash
npm install @efinsign/api
```

### efinsuite Integration Example
```typescript
// efinsuite backend (Node.js)
import { eFinSign } from '@efinsign/api';

const efi = new eFinSign({
  apiKey: process.env.EFINSIGN_API_KEY,  // efsk_live_xxx
});

// When accountant clicks "Send for Signature"
async function sendInvoiceForSignature(invoice: Invoice) {
  // 1. Upload invoice PDF
  const doc = await efi.documents.create({
    file: invoice.pdfBuffer,
    title: `Invoice #${invoice.number}`,
    metadata: {
      invoiceId: invoice.id,
      efinsuiteRef: invoice.reference,
    },
  });

  // 2. Add client as signer with fields
  await efi.signers.add(doc.id, {
    name: invoice.clientName,
    email: invoice.clientEmail,
    fields: [
      {
        type: 'signature',
        page: invoice.signaturePage,
        x: 100, y: 500, w: 200, h: 50,
      },
      {
        type: 'date',
        page: invoice.signaturePage,
        x: 350, y: 500, w: 150, h: 30,
      },
    ],
  });

  // 3. Send for signing
  await efi.documents.send(doc.id);

  return doc;
}

// Webhook handler (efinsuite receives this)
app.post('/webhooks/efinsign', async (req, res) => {
  const valid = efi.webhooks.verify({
    payload: req.body,
    signature: req.headers['x-efinsign-signature'],
    secret: process.env.EFINSIGN_WEBHOOK_SECRET,
  });
  if (!valid) return res.status(401).end();

  const { event, document_id } = req.body;

  if (event === 'document.completed') {
    // Download signed PDF
    const pdf = await efi.documents.download(document_id, { type: 'signed' });

    // Store back in efinsuite
    await db.invoices.update(document.metadata.invoiceId, {
      status: 'signed',
      signedPdf: pdf,
      signedAt: new Date(),
    });
  }
});
```

---

## Implementation Order (Revised)

| # | Phase | Dependencies | Delivers |
|---|---|---|---|
| **0** | API Key System + Sandbox | Nothing | Key gen, validation, sandbox mode, OrgSettings UI, `_shared/` utilities |
| **1** | Core REST API (Documents, Signers, Fields, Templates, Clients, Org) | Phase 0 | 25+ Edge Functions, full CRUD for signing |
| **2** | OpenAPI Spec | Phase 1 | `openapi.yaml` — the contract |
| **3** | Webhooks | Phase 0 (keys) + Phase 1 (documents) | Event delivery, retry, signature verification |
| **4** | Dev Portal | Phase 2 (OpenAPI) | `developers.efinsign.ca` with Scalar, guides, webhook tester |
| **5** | Client SDK | Phase 2 (OpenAPI) | `@efinsign/api` on npm |
| **6** | Embed Widget | Phase 1 (documents/signers) | iframe signing with PostMessage |
| **7** | Polish | Everything above | Rate limiting, usage analytics, Postman collection, E2E tests |

### Why webhooks moved to Phase 3 (before Dev Portal)
Because efinsuite needs webhooks to work for the integration to be viable. Without webhooks, it's poll-only which is terrible DX. Webhooks are the bridge between the two platforms.

---

## How efinsuite Tests Its Integration (End-to-End)

```
Phase 0-3 Complete → efinsuite can start integration

Step 1: efinsuite dev creates sandbox key in eFinSign
Step 2: Sets up webhook endpoint in efinsuite (localhost dev)
Step 3: Uses @efinsign/api SDK in sandbox mode
Step 4: Runs full flow:
  - Upload test invoice PDF → eFinSign API
  - Add test signer → eFinSign API
  - Send for signing → eFinSign API
  - Gets signing link from sandbox email log (no real email sent)
  - Opens signing link in browser, signs
  - Webhook fires to efinsuite's local webhook endpoint
  - efinsuite downloads signed PDF
  - efinsuite stores it → marks invoice signed ✓
Step 5: Moves to production: upgrades key, changes env var, real flow works
```

---

## File Structure (After All Phases)

```
efinsign-main/
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── cors.ts
│   │   │   ├── auth.ts              # validateApiKey(org_id, mode, scopes)
│   │   │   ├── errors.ts            # throw ErrorResponse(400, 'validation_error', ...)
│   │   │   ├── pagination.ts        # paginate(query, page, perPage)
│   │   │   ├── rate-limit.ts        # checkRateLimit(keyId, limit)
│   │   │   └── validation.ts        # Zod schemas shared across functions
│   │   ├── api-keys/
│   │   │   ├── generate/
│   │   │   ├── list/
│   │   │   ├── revoke/
│   │   │   └── upgrade/
│   │   ├── status/
│   │   ├── api-v1/
│   │   │   ├── documents-create/
│   │   │   ├── documents-list/
│   │   │   ├── documents-get/
│   │   │   ├── documents-update/
│   │   │   ├── documents-delete/
│   │   │   ├── documents-download/
│   │   │   ├── documents-audit-log/
│   │   │   ├── documents-send/
│   │   │   ├── documents-void/
│   │   │   ├── documents-remind/
│   │   │   ├── signers-add/
│   │   │   ├── signers-list/
│   │   │   ├── signers-update/
│   │   │   ├── signers-remove/
│   │   │   ├── fields-add/
│   │   │   ├── fields-update/
│   │   │   ├── fields-remove/
│   │   │   ├── templates-create/
│   │   │   ├── templates-list/
│   │   │   ├── templates-get/
│   │   │   ├── templates-delete/
│   │   │   ├── templates-create-document/
│   │   │   ├── webhooks-create/
│   │   │   ├── webhooks-list/
│   │   │   ├── webhooks-delete/
│   │   │   ├── webhooks-test/
│   │   │   ├── organization-get/
│   │   │   ├── organization-update/
│   │   │   ├── organization-usage/
│   │   │   ├── clients-create/
│   │   │   ├── clients-list/
│   │   │   ├── clients-get/
│   │   │   ├── clients-update/
│   │   │   ├── clients-delete/
│   │   │   ├── embed-signing-url/
│   │   │   ├── embed-status/
│   │   │   └── openapi/
│   │   └── dispatch-webhooks/
│   ├── migrations/
│   │   ├── ...existing...
│   │   ├── XXXXXX_api_keys.sql
│   │   ├── XXXXXX_webhooks.sql
│   │   └── XXXXXX_webhook_deliveries.sql
├── openapi.yaml                         # Source of truth for API spec
├── developers-portal/                   # VitePress app
├── sdk/                                 # @efinsign/api npm package
└── src/                                 # Existing React SPA
    ├── pages/
    │   ├── EmbedSign.tsx                # NEW
    │   └── ...
    └── components/
        ├── embed/                       # NEW
        └── ...
```
