# Quickstart

Get your first API call working in 5 minutes.

## 1. Get a Sandbox API Key

1. Sign up at [efinsign.ca](https://efinsign.ca)
2. Create or join an organization
3. Go to **Settings → API Keys**
4. Click **Generate**, give it a name, select scopes, and copy the key

Your key looks like: `efsk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

::: warning Store it securely
The full key is shown only once. If you lose it, revoke and generate a new one.
:::

## 2. Create a Document

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/documents \
  -H "Authorization: Bearer efsk_test_YOUR_KEY" \
  -F "file=@contract.pdf" \
  -F "title=Service Agreement 2026"
```

Response:

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "title": "Service Agreement 2026",
    "status": "draft",
    "created_at": "2026-07-20T22:00:00Z"
  }
}
```

## 3. Add a Signer

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/documents/REPLACE_DOC_ID/signers \
  -H "Authorization: Bearer efsk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "fields": [
      {"type": "signature", "page": 1, "x": 100, "y": 500, "w": 200, "h": 50},
      {"type": "date", "page": 1, "x": 350, "y": 500, "w": 150, "h": 30}
    ]
  }'
```

## 4. Send for Signing

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/documents/REPLACE_DOC_ID/send \
  -H "Authorization: Bearer efsk_test_YOUR_KEY"
```

In **sandbox mode**, no email is sent — you can find the signing link in the Sandbox Email Log in the dashboard. In **production**, the signer receives an email with a link to sign.

## 5. Track Progress

```bash
curl https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/documents/REPLACE_DOC_ID \
  -H "Authorization: Bearer efsk_test_YOUR_KEY"
```

Or set up [webhooks](/webhooks) to get real-time notifications.

## Next Steps

- [Authentication guide](/authentication) — key types, scopes, sandbox vs production
- [Document lifecycle](/concepts/documents) — statuses, fields, download
- [API Reference](/api-reference) — all 32 endpoints
- [Postman Collection](https://github.com/efinsign/efinsign-api/blob/main/postman-collection.json) — import and test instantly
