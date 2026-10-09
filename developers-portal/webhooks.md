# Setting Up Webhooks

Learn how to receive real-time events from eFinSign with verified HMAC signatures.

## 1. Register a Webhook

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/webhooks \
  -H "Authorization: Bearer efsk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourapp.com/webhooks/efinsign",
    "events": ["document.completed", "document.declined", "document.signer_signed"]
  }'
```

Response:

```json
{
  "data": {
    "id": "wh_abc123",
    "url": "https://yourapp.com/webhooks/efinsign",
    "secret": "a1b2c3d4e5f6...",
    "events": ["document.completed", "document.declined", "document.signer_signed"],
    "message": "Store this secret. It will not be shown again."
  }
}
```

::: danger Store the secret
The `secret` is shown **only once**. Store it in your environment variables. You'll need it to verify signatures.
:::

## 2. Handle Incoming Webhooks

Your endpoint receives POST requests:

```javascript
// Express example
app.post("/webhooks/efinsign", express.json(), (req, res) => {
  const signature = req.headers["x-efinsign-signature"];
  const event = req.headers["x-efinsign-event"];

  // Verify the signature
  if (!verifySignature(req.body, signature, process.env.EFINSIGN_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Process the event
  switch (event) {
    case "document.completed":
      handleCompleted(req.body);
      break;
    case "document.signer_signed":
      handleSignerSigned(req.body);
      break;
    case "document.declined":
      handleDeclined(req.body);
      break;
  }

  // Acknowledge receipt
  res.status(200).json({ received: true });
});
```

## 3. Verify Signatures

The `X-Efinsign-Signature` header uses the format:
```
t=1234567890,v1=hex_signature
```

The signature is an HMAC-SHA256 of `{timestamp}.{payload_json}` using your webhook secret.

### Node.js Verification

```javascript
const crypto = require("crypto");

function verifySignature(payload, signatureHeader, secret, tolerance = 300) {
  const parts = {};
  signatureHeader.split(",").forEach((part) => {
    const [k, v] = part.split("=");
    parts[k] = v;
  });

  const timestamp = parseInt(parts.t);
  if (!timestamp || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance) {
    return false;
  }

  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
```

### Python Verification

```python
import hmac, hashlib, json, time

def verify_signature(payload, signature_header, secret, tolerance=300):
    parts = dict(p.split("=") for p in signature_header.split(","))
    timestamp = int(parts["t"])

    if abs(int(time.time()) - timestamp) > tolerance:
        return False

    signed_payload = f"{timestamp}.{json.dumps(payload, separators=(',', ':'))}"
    expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()

    return hmac.compare_digest(expected, parts["v1"])
```

## 4. Test Your Webhook

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/webhooks/wh_abc123/test \
  -H "Authorization: Bearer efsk_live_YOUR_KEY"
```

This queues a test event that will be delivered to your endpoint.

## 5. Monitor Deliveries

List your webhooks to see delivery status:

```bash
curl https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/webhooks \
  -H "Authorization: Bearer efsk_live_YOUR_KEY"
```

Each webhook shows `last_success_at`, `last_attempt_at`, and `failure_count`.

## Best Practices

- **Respond quickly** (within 10 seconds) — the dispatcher has a timeout
- **Return 2xx** to acknowledge — otherwise the delivery is counted as failed
- **Process asynchronously** — acknowledge immediately, process the event in a background job
- **Make your endpoint idempotent** — the same event may be delivered more than once
- **Verify the signature** — always, before processing any payload
