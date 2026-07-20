# Authentication

All API requests require an API key passed as a Bearer token.

```
Authorization: Bearer efsk_test_a1b2c3d4...
```

## Key Types

| Type | Prefix | Use Case |
|------|--------|----------|
| **Sandbox** | `efsk_test_` | Development and testing. Free. |
| **Production** | `efsk_live_` | Live applications. Requires paid subscription. |

## Sandbox Mode

Sandbox keys are free and available instantly to anyone with an eFinSign account.

| Feature | Sandbox Behavior |
|---------|-----------------|
| Emails | Not sent — view signing links in the dashboard |
| PDFs | Watermarked with "TEST DOCUMENT — NOT LEGALLY BINDING" |
| Document limit | 100 documents per month |
| Rate limit | 60 requests per minute |
| Upgrade | One click when you're ready for production |

## Production Mode

Production keys require an active subscription. Upgrade any sandbox key from **Settings → API Keys** in the dashboard.

| Feature | Production Behavior |
|---------|-------------------|
| Emails | Sent via Resend to real recipients |
| PDFs | Clean, no watermark |
| Document limit | Based on your plan |
| Rate limit | 1000 requests per minute |

## Scopes

Each API key has a set of scopes that control what it can do:

| Scope | Permissions |
|-------|------------|
| `documents:read` | List and retrieve documents, download PDFs, view audit logs |
| `documents:write` | Create, update, and delete documents |
| `signing:send` | Send documents for signing, void, remind, manage signers and fields |
| `webhooks:manage` | Register and manage webhook endpoints |
| `org:read` | Read organization details and usage |
| `org:write` | Update organization profile |
| `clients:read` | List and retrieve client contacts |
| `clients:write` | Create, update, and delete clients |

Select the minimum scopes your application needs when generating a key.

## Managing Keys

- **Generate**: Settings → API Keys → Generate. Name your key and select scopes.
- **List**: View all keys (only key prefix shown, never the full key).
- **Revoke**: Immediately disables the key. Cannot be undone.
- **Upgrade**: Converts a sandbox key to production (requires subscription).

## Error Responses

| Status | Code | Meaning |
|--------|------|---------|
| 401 | `unauthorized` | Missing, invalid, or revoked API key |
| 402 | `no_subscription` | Production upgrade requires active subscription |
| 403 | `forbidden` | Key lacks required scope |
| 429 | `rate_limited` | Too many requests — slow down |

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or revoked API key"
  }
}
```
