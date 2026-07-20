# Documents

Documents are the core resource in eFinSign. Each document represents a PDF that can be signed by one or more signers.

## Document Lifecycle

```
draft  →  pending  →  completed
                    →  expired (voided)
                    →  declined
```

| Status | Description |
|--------|-------------|
| `draft` | Document created, signers being added. Not yet sent. |
| `pending` | Sent for signing. Awaiting signer action. |
| `completed` | All signers have signed. Final PDF generated. |
| `expired` | Voided by the sender before completion. |
| `declined` | A signer declined to sign. |

## Creating a Document

Upload a PDF via multipart form data:

```
POST /documents
Content-Type: multipart/form-data

file: contract.pdf
title: Service Agreement 2026
```

The document starts in `draft` status. Add signers and fields before sending.

## Adding Signers and Fields

After creating a document, add signers with their signature fields:

```
POST /documents/:id/signers
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "order": 1,
  "fields": [
    { "type": "signature", "page": 1, "x": 100, "y": 500, "w": 200, "h": 50 },
    { "type": "date",     "page": 1, "x": 350, "y": 500, "w": 150, "h": 30 }
  ]
}
```

### Field Types

| Type | Description |
|------|-------------|
| `signature` | Hand-drawn or uploaded signature |
| `initials` | Signer's initials |
| `name` | Signer's typed full name |
| `date` | Auto-filled date |
| `text` | Free text input |
| `checkbox` | Checkbox |
| `checkmark` | Checkmark |
| `full_name` | Pre-filled full name |
| `title` | Signer's title |

### Signing Order

Set `order` to control sequential signing:
- `0` or unset: Any order (parallel signing)
- `1, 2, 3...`: Signer 1 must sign before signer 2 can access the document

## Sending for Signing

```
POST /documents/:id/send
```

Requires at least one signer. Changes status from `draft` to `pending`. In production, emails are sent to all signers.

## Downloading

```
GET /documents/:id/download?type=signed
GET /documents/:id/download?type=original
```

Returns the PDF as binary. Use `type=signed` for the completed signed copy.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents` | Create and upload |
| `GET` | `/documents` | List (paginated, filterable) |
| `GET` | `/documents/:id` | Get with signers and fields |
| `PATCH` | `/documents/:id` | Update metadata |
| `DELETE` | `/documents/:id` | Delete (draft only) |
| `GET` | `/documents/:id/download` | Download PDF |
| `GET` | `/documents/:id/audit-log` | Audit trail |
| `POST` | `/documents/:id/send` | Send for signing |
| `POST` | `/documents/:id/void` | Void |
| `POST` | `/documents/:id/remind` | Remind signers |
