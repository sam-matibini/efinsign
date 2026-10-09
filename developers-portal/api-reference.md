---
aside: false
---

# API Reference

The full eFinSign API is documented in OpenAPI 3.1 format.

## Interactive Explorer

Use the [Scalar API Reference](https://cdn.scalar.com) to browse and test all endpoints interactively:

1. Go to [Scalar API Client](https://client.scalar.com)
2. Enter: `https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/openapi.json`
3. Authenticate with your API key

## OpenAPI Spec

```bash
curl https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api/openapi.json
```

## All Endpoints

### Documents
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents` | Upload and create document |
| `GET` | `/documents` | List documents |
| `GET` | `/documents/:id` | Get document details |
| `PATCH` | `/documents/:id` | Update document |
| `DELETE` | `/documents/:id` | Delete document |
| `GET` | `/documents/:id/download` | Download PDF |
| `GET` | `/documents/:id/audit-log` | Get audit trail |
| `POST` | `/documents/:id/send` | Send for signing |
| `POST` | `/documents/:id/void` | Void document |
| `POST` | `/documents/:id/remind` | Remind signers |

### Signers & Fields
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents/:id/signers` | Add signer |
| `GET` | `/documents/:id/signers` | List signers |
| `PATCH` | `/documents/:id/signers/:sid` | Update signer |
| `DELETE` | `/documents/:id/signers/:sid` | Remove signer |
| `POST` | `/documents/:id/signers/:sid/fields` | Add field |
| `PATCH` | `/documents/:id/signers/:sid/fields/:fid` | Update field |
| `DELETE` | `/documents/:id/signers/:sid/fields/:fid` | Remove field |

### Templates
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/templates` | Create template |
| `GET` | `/templates` | List templates |
| `GET` | `/templates/:id` | Get template |
| `DELETE` | `/templates/:id` | Delete template |
| `POST` | `/templates/:id/documents` | Create from template |

### Embed
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/embed/signing-url` | Get signing URL |
| `GET` | `/embed/status/:token` | Get signing status |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks` | Register webhook |
| `GET` | `/webhooks` | List webhooks |
| `DELETE` | `/webhooks/:id` | Delete webhook |
| `POST` | `/webhooks/:id/test` | Send test event |

### Organization
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/organization` | Get organization |
| `PATCH` | `/organization` | Update organization |
| `GET` | `/organization/usage` | Get usage stats |

### Clients
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/clients` | Create client |
| `GET` | `/clients` | List clients |
| `GET` | `/clients/:id` | Get client |
| `PATCH` | `/clients/:id` | Update client |
| `DELETE` | `/clients/:id` | Delete client |

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no body) |
| 400 | Validation error |
| 401 | Invalid or missing API key |
| 402 | Subscription required |
| 403 | Missing scope |
| 404 | Not found |
| 429 | Rate limited |
