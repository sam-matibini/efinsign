# Changelog

## v1.0.0 — July 2026

### Initial Release

First public release of the eFinSign API.

**Features:**
- **Documents API** — Upload, manage, and send PDFs for signing (10 endpoints)
- **Signers & Fields API** — Add signers with signature fields (7 endpoints)
- **Templates API** — Create reusable templates and instantiate documents (5 endpoints)
- **Embed API** — Generate embeddable signing URLs (2 endpoints)
- **Webhooks API** — Register and manage webhook endpoints (4 endpoints)
- **Organization API** — Read and update org profile, view usage (3 endpoints)
- **Clients API** — Address book CRUD (5 endpoints)

**Authentication:**
- Bearer token API keys (`efsk_test_` / `efsk_live_`)
- Scope-based access control (8 scopes)
- Sandbox mode with instant key generation
- Production mode tied to subscription plans

**Webhooks:**
- Event-driven with HMAC-SHA256 signatures
- 4 event types: `document.sent`, `document.completed`, `document.voided`, `document.signer_signed`, `document.signer_declined`
- Database triggers for reliable event queuing
- Retry logic with failure counting

**Developer Experience:**
- OpenAPI 3.1 specification (`/openapi.json`)
- Developer portal at `efinsign.ca/developers`
- Interactive API explorer via Scalar
- cURL examples for all endpoints

**Pending (v1.1+):**
- `@efinsign/api` npm package (SDK)
- Embeddable signing widget (iframe + PostMessage)
- Postman Collection
- Rate limiting analytics dashboard
- Additional webhook event types
