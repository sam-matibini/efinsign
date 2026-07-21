---
layout: home

hero:
  name: eFinSign API
  text: E‑signatures for your application.
  tagline: Create documents, add signers, send for signing, and track completion — all via REST.
  actions:
    - theme: brand
      text: Get Started
      link: /quickstart
    - theme: alt
      text: API Reference
      link: /api-reference

features:
  - icon: 📄
    title: Document Management
    details: Upload PDFs, place signature fields, manage the full document lifecycle from draft to signed.
  - icon: ✍️
    title: Multi-signer Workflows
    details: Sequential or parallel signing. Add signers with custom fields — signature, date, initials, text, and more.
  - icon: 🔔
    title: Webhooks
    details: Real-time event delivery with HMAC signatures. Know instantly when documents are signed or declined.
  - icon: 🧩
    title: Embeddable Widget
    details: Embed the signing experience directly in your app with an iframe and PostMessage API.
  - icon: 📋
    title: Templates
    details: Create reusable templates with pre-placed fields. Instantiate documents from templates in one API call.
  - icon: 🔑
    title: Production API Keys
    details: Generate API keys instantly from your dashboard. No credit card required to start.
---

## Quickstart

```bash
curl -X POST https://api.efinsign.ca/functions/v1/api/documents \
  -H "Authorization: Bearer efsk_live_YOUR_KEY" \
  -F "file=@contract.pdf" \
  -F "title=Service Agreement"
```

[Start building →](/quickstart)

Get your API key instantly from [Settings → API Keys](https://efinsign.ca/settings/organization) in the eFinSign dashboard.
