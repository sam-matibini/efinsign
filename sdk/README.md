# @efinsign/api

Official TypeScript/JavaScript SDK for the [eFinSign](https://efinsign.ca) e-signature API.

## Installation

```bash
npm install @efinsign/api
```

## Quickstart

```typescript
import { eFinSign } from "@efinsign/api";

const efi = new eFinSign({
  apiKey: process.env.EFINSIGN_API_KEY,
});

// Upload and create a document
const doc = await efi.documents.create({
  file: fs.readFileSync("./contract.pdf"),
  title: "Service Agreement 2026",
});

// Add a signer with signature fields
await efi.signers.add(doc.id, {
  name: "Jane Smith",
  email: "jane@example.com",
  fields: [
    { type: "signature", page: 1, x: 100, y: 500, w: 200, h: 50 },
    { type: "date", page: 1, x: 350, y: 500, w: 150, h: 30 },
  ],
});

// Send for signing
await efi.documents.send(doc.id);
```

## API Reference

### Documents

```typescript
efi.documents.create({ file, title })        // Upload PDF and create document
efi.documents.list({ status, search, page }) // Paginated list with filters
efi.documents.get(id)                        // Get with signers and fields
efi.documents.update(id, { title })          // Update metadata
efi.documents.delete(id)                     // Delete (draft only)
efi.documents.download(id, { type })         // Download PDF as Uint8Array
efi.documents.auditLog(id)                   // Full audit trail
efi.documents.send(id)                       // Send for signing
efi.documents.void(id)                       // Void a pending document
efi.documents.remind(id)                     // Remind pending signers
```

### Signers & Fields

```typescript
efi.signers.add(docId, { name, email, order, fields })
efi.signers.list(docId)
efi.signers.update(docId, signerId, { name, email, order })
efi.signers.remove(docId, signerId)
efi.signers.addField(docId, signerId, { type, page, x, y, w, h })
efi.signers.updateField(docId, signerId, fieldId, { ... })
efi.signers.removeField(docId, signerId, fieldId)
```

### Templates

```typescript
efi.templates.create({ title, description, signers, fields, tags })
efi.templates.list({ search, page })
efi.templates.get(id)
efi.templates.delete(id)
efi.templates.createDocument(templateId, { title })
```

### Embed

```typescript
efi.embed.getSigningUrl({ documentId, signerEmail })
efi.embed.getSigningUrl({ signerId })
efi.embed.getStatus(token)
```

### Webhooks

```typescript
efi.webhooks.create({ url, events })
efi.webhooks.list()
efi.webhooks.delete(id)
efi.webhooks.test(id)
```

### Webhook Signature Verification

```typescript
// Verify incoming webhook (server-side)
const isValid = efi.webhooks.verify({
  payload: req.body,                          // Raw body or object
  signature: req.headers["x-efinsign-signature"],
  secret: process.env.EFINSIGN_WEBHOOK_SECRET,
  tolerance: 300,                             // Seconds (optional, default 300)
});
```

### Organization

```typescript
efi.organization.get()
efi.organization.update({ name, address, ... })
efi.organization.usage()
```

### Clients

```typescript
efi.clients.create({ name, email, company, ... })
efi.clients.list({ search, page })
efi.clients.get(id)
efi.clients.update(id, { ... })
efi.clients.delete(id)
```

## Error Handling

```typescript
import { eFinSignError } from "@efinsign/api";

try {
  const doc = await efi.documents.get("invalid-id");
} catch (err) {
  if (err instanceof eFinSignError) {
    console.error(`[${err.status}] ${err.code}: ${err.message}`);
    // [404] not_found: Document not found
  }
}
```

## Configuration

```typescript
const efi = new eFinSign({
  apiKey: "efsk_test_xxx",                       // Required
  baseUrl: "https://custom-proxy.example.com",   // Optional: override base URL
  timeout: 60000,                                 // Optional: request timeout in ms (default 30000)
});
```

## Documentation

- [Developer Portal](https://developers.efinsign.ca) — Full API documentation
- [eFinSign Dashboard](https://efinsign.ca) — Generate API keys, manage documents

## License

MIT
