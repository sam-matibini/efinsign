# Embedding the Signing Widget

Embed eFinSign's signature experience directly in your application using an iframe and the PostMessage API.

## Getting a Signing URL

First, get an embeddable signing URL for a specific signer:

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/embed/signing-url \
  -H "Authorization: Bearer efsk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "doc_123",
    "signer_email": "jane@example.com"
  }'
```

Response:

```json
{
  "data": {
    "url": "https://...",
    "signing_url": "https://efinsign.ca/sign?token=abc123",
    "embed_url": "https://efinsign.ca/embed/sign?token=abc123",
    "signer_email": "jane@example.com",
    "signer_name": "Jane Smith"
  }
}
```

Use `embed_url` for the iframe. Use `signing_url` if you prefer a redirect.

## Embedding the iframe

```html
<iframe
  src="https://efinsign.ca/embed/sign?token=abc123&primary=#2563EB"
  style="width: 100%; height: 700px; border: none;"
  allow="clipboard-write"
></iframe>
```

### Customization via URL Parameters

| Parameter | Description |
|-----------|-------------|
| `primary` | Primary accent color (hex) — `?primary=%232563EB` |
| `logo` | Custom logo URL — `?logo=https://yoursite.com/logo.png` |

## PostMessage API

The widget communicates with the parent window via `postMessage`. Listen for these events:

```javascript
window.addEventListener("message", (event) => {
  // Verify origin
  if (event.origin !== "https://efinsign.ca") return;

  switch (event.data.type) {
    case "EFINSIGN_READY":
      console.log("Widget loaded");
      break;

    case "EFINSIGN_SIGNER_VIEWED":
      console.log("Signer opened document");
      break;

    case "EFINSIGN_SIGNER_COMPLETED":
      console.log("Signer finished signing");
      // Navigate to next step, close modal, etc.
      break;

    case "EFINSIGN_SIGNER_DECLINED":
      console.log("Signer declined:", event.data.reason);
      break;

    case "EFINSIGN_ERROR":
      console.error("Widget error:", event.data.message);
      break;
  }
});
```

## Event Payloads

```typescript
// EFINSIGN_READY
{ type: "EFINSIGN_READY" }

// EFINSIGN_SIGNER_VIEWED
{ type: "EFINSIGN_SIGNER_VIEWED", signer: { name: "Jane", email: "jane@example.com" } }

// EFINSIGN_SIGNER_COMPLETED
{ type: "EFINSIGN_SIGNER_COMPLETED", signer: { name: "Jane", status: "signed" } }

// EFINSIGN_SIGNER_DECLINED
{ type: "EFINSIGN_SIGNER_DECLINED", signer: { name: "Jane" }, reason: "Not interested" }

// EFINSIGN_ERROR
{ type: "EFINSIGN_ERROR", message: "Something went wrong" }
```

::: tip Combine with Webhooks
Use PostMessage for UI events (widget loaded, signer completed) and Webhooks for server-side events (document completed, signed PDF available for download).
:::
