# Templates

Templates let you pre-define documents with signers and fields for repeated use. Create a template once, then instantiate documents from it in a single API call.

## Creating a Template

You can create a template from a PDF file or define it with just metadata:

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/templates \
  -H "Authorization: Bearer efsk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "NDA Template",
    "description": "Standard non-disclosure agreement",
    "signers": [
      { "name": "Disclosing Party", "email": "" },
      { "name": "Receiving Party", "email": "" }
    ],
    "fields": [
      { "type": "signature", "page": 3, "x": 100, "y": 500, "w": 200, "h": 50, "signer_index": 0 },
      { "type": "signature", "page": 3, "x": 350, "y": 500, "w": 200, "h": 50, "signer_index": 1 },
      { "type": "date",      "page": 3, "x": 100, "y": 570, "w": 150, "h": 30, "signer_index": 0 },
      { "type": "date",      "page": 3, "x": 350, "y": 570, "w": 150, "h": 30, "signer_index": 1 }
    ],
    "tags": ["legal", "nda"]
  }'
```

## Creating a Document from a Template

```bash
curl -X POST https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/templates/tmpl_456/documents \
  -H "Authorization: Bearer efsk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "NDA - Acme Corp"}'
```

This creates a new draft document with all signers and fields pre-populated from the template. You can then update specific signer emails before sending:

```bash
curl -X PATCH https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/documents/doc_789/signers/signer_001 \
  -H "Authorization: Bearer efsk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "legal@acmecorp.com"}'
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/templates` | Create template |
| `GET` | `/templates` | List templates (paginated) |
| `GET` | `/templates/:id` | Get template definition |
| `DELETE` | `/templates/:id` | Delete template |
| `POST` | `/templates/:id/documents` | Create document from template |
