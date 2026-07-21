# Authentication

All API requests require an API key passed as a Bearer token.

```
Authorization: Bearer efsk_live_a1b2c3d4...
```

## Key Types

All API keys use the `efsk_live_` prefix. Generate keys from **Settings → API Keys** in the eFinSign dashboard.

## Managing Keys

- **Generate**: Settings → API Keys → Generate. Name your key and select scopes.
- **List**: View all keys (only key prefix shown, never the full key).
- **Revoke**: Immediately disables the key. Cannot be undone.

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
- **Scopes**: Select the minimum scopes your application needs.

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
