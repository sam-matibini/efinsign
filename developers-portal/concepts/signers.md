# Signers & Fields

Signers are the people who need to sign a document. Each signer can have multiple fields placed on the document pages.

## Signer Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Full name of the signer (required) |
| `email` | string | Email address (required) |
| `order` | integer | Signing order. 0 = any order, 1+ = sequential |
| `status` | string | `pending`, `viewed`, `signed`, or `declined` |
| `color` | string | Hex color assigned to this signer's fields on the PDF |

## Field Properties

Fields define where signature elements appear on the document.

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Field type (required) |
| `page` | integer | PDF page number (1-based) |
| `x` | number | X coordinate from left |
| `y` | number | Y coordinate from top |
| `w` | number | Field width |
| `h` | number | Field height |
| `label` | string | Optional display label |

::: tip Coordinates
Field positions use PDF coordinate space. The easiest way to get coordinates is to use the visual editor in the eFinSign dashboard. For API-only workflows, approximate coordinates work — signers can adjust during signing.
:::

## Endpoints

### Signers

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents/:id/signers` | Add signer with optional fields |
| `GET` | `/documents/:id/signers` | List signers with their fields |
| `PATCH` | `/documents/:id/signers/:sid` | Update signer info |
| `DELETE` | `/documents/:id/signers/:sid` | Remove signer (draft only) |

### Fields

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents/:id/signers/:sid/fields` | Add field to signer |
| `PATCH` | `/documents/:id/signers/:sid/fields/:fid` | Update field position/type |
| `DELETE` | `/documents/:id/signers/:sid/fields/:fid` | Remove field |

## Example: Adding a Signer with Multiple Fields

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/documents/doc_123/signers \
  -H "Authorization: Bearer efsk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "order": 1,
    "fields": [
      { "type": "signature", "page": 1, "x": 100, "y": 600, "w": 200, "h": 50 },
      { "type": "date",      "page": 1, "x": 350, "y": 600, "w": 150, "h": 30 },
      { "type": "initials",  "page": 2, "x": 50,  "y": 700, "w": 100, "h": 40 }
    ]
  }'
```
