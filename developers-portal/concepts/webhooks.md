# Webhooks (Concept)

Webhooks are HTTP callbacks that notify your application when events happen in eFinSign.

## How It Works

1. Your application registers a webhook URL with eFinSign
2. When a document status changes or a signer acts, eFinSign queues a delivery
3. The dispatcher sends a signed POST request to your URL
4. Your application verifies the signature and processes the event

```
Document status changes → DB trigger queues delivery → dispatcher sends POST → your app
```

## Event Types

| Event | Trigger |
|-------|---------|
| `document.sent` | Document sent for signing |
| `document.completed` | All signers have signed |
| `document.voided` | Document voided by sender |
| `document.signer_signed` | Individual signer completed signing |
| `document.signer_declined` | Signer declined to sign |

## Payload Format

```json
{
  "event": "document.completed",
  "document_id": "a1b2c3d4-e5f6-...",
  "title": "Service Agreement 2026",
  "completed_at": "2026-07-20T22:30:00Z"
}
```

Headers:

```
Content-Type: application/json
X-Efinsign-Signature: t=1234567890,v1=abcd1234...
X-Efinsign-Event: document.completed
User-Agent: eFinSign-Webhook/1.0
```

## Delivery & Retries

- Dispatcher processes up to 50 deliveries per run
- Each delivery has a 10-second timeout
- Failed deliveries increment a failure counter on the webhook
- After 5 consecutive failures, deliveries stop for that webhook
- You can re-enable by updating the webhook in the dashboard

See the [Webhooks Setup Guide](/webhooks) for implementation details.
