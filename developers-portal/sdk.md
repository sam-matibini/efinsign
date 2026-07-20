# SDK Overview

The official eFinSign JavaScript/TypeScript SDK (`@efinsign/api`) provides a type-safe, promise-based interface to the REST API.

::: info Coming Soon
The SDK is currently in development. This page documents the planned API. For now, use the [REST API directly](/api-reference).
:::

## Installation

```bash
npm install @efinsign/api
```

## Quick Example

```typescript
import { eFinSign } from "@efinsign/api";

const efi = new eFinSign({
  apiKey: process.env.EFINSIGN_API_KEY,
});

// Create document
const doc = await efi.documents.create({
  file: fs.readFileSync("./contract.pdf"),
  title: "Service Agreement",
});

// Add signer
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

// Later: download signed PDF
const pdf = await efi.documents.download(doc.id, { type: "signed" });
```

## API Surface

### Documents

```typescript
efi.documents.create({ file, title })        // → Document
efi.documents.list({ status, search, page }) // → { data: Document[], meta }
efi.documents.get(id)                        // → DocumentDetail
efi.documents.update(id, { title })          // → Document
efi.documents.delete(id)                     // → void
efi.documents.download(id, { type })         // → Buffer
efi.documents.auditLog(id)                   // → AuditLogEntry[]
efi.documents.send(id)                       // → Document
efi.documents.void(id)                       // → void
efi.documents.remind(id)                     // → void
```

### Signers

```typescript
efi.signers.add(docId, { name, email, order, fields })
efi.signers.list(docId)
efi.signers.update(docId, signerId, { name, email, order })
efi.signers.remove(docId, signerId)
```

### Templates

```typescript
efi.templates.create({ title, description, signers, fields })
efi.templates.list({ search, page })
efi.templates.get(id)
efi.templates.delete(id)
efi.templates.createDocument(templateId, { title })
```

### Embed

```typescript
efi.embed.getSigningUrl({ documentId, signerEmail })  // → { url, signingUrl, embedUrl }
efi.embed.getSigningUrl({ signerId })
efi.embed.getStatus(token)
```

### Webhooks

```typescript
efi.webhooks.create({ url, events })
efi.webhooks.list()
efi.webhooks.delete(id)
efi.webhooks.test(id)

// Verification (server-side, no API key needed)
efi.webhooks.verify({ payload, signature, secret, tolerance })
```

### Organization & Clients

```typescript
efi.organization.get()
efi.organization.update({ name, address, ... })
efi.organization.usage()

efi.clients.create({ name, email, company, ... })
efi.clients.list({ search, page })
efi.clients.get(id)
efi.clients.update(id, { ... })
efi.clients.delete(id)
```

## Configuration

```typescript
const efi = new eFinSign({
  apiKey: "efsk_test_xxx",     // Your API key
  baseUrl: undefined,           // Optional: override base URL
  timeout: 30000,               // Request timeout in ms (default: 30s)
  maxRetries: 3,                // Retry on 429/5xx (default: 3)
});
```
