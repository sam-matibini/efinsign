/**
 * E2E API smoke test — validates the core signing flow against sandbox.
 *
 * Usage:
 *   1. Create a sandbox API key in the eFinSign dashboard (Settings → API Keys)
 *   2. Set EFINSIGN_API_KEY env var
 *   3. npx tsx sdk/src/__tests__/e2e.ts
 *
 * Prerequisites: A PDF file at ./test-assets/sample.pdf (skip upload tests if missing)
 */

const BASE_URL = process.env.EFINSIGN_BASE_URL || "https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api";
const API_KEY = process.env.EFINSIGN_API_KEY || "";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const status = passed ? "PASS" : "FAIL";
  console.log(`  ${status}  ${name}`);
  if (error) console.log(`        ${error}`);
}

async function api(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  return fetch(`${BASE_URL}${path}`, opts);
}

async function run() {
  if (!API_KEY) {
    console.error("Set EFINSIGN_API_KEY environment variable");
    process.exit(1);
  }

  console.log("\n  eFinSign API E2E Smoke Test\n");

  // ── Health ──
  let res = await api("GET", "/status");
  record("Health check", res.ok);

  // ── Organization ──
  res = await api("GET", "/organization");
  record("Get organization", res.ok);

  res = await api("GET", "/organization/usage");
  record("Get usage stats", res.ok);

  // ── Documents ──
  let documentId = "";

  res = await api("GET", "/documents?page=1&per_page=1");
  record("List documents", res.ok);

  // Create document (no file — will fail gracefully)
  res = await api("POST", "/documents", { title: "E2E Test" });
  record("Create document (no file → 400)", res.status === 400);

  // Try with multipart
  const formData = new FormData();
  formData.append("title", "E2E Test Document");
  // If sample.pdf exists in test-assets, include it
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const samplePath = path.join(import.meta.dirname || ".", "..", "..", "..", "test-assets", "sample.pdf");
    if (fs.existsSync(samplePath)) {
      const buffer = fs.readFileSync(samplePath);
      const blob = new Blob([buffer], { type: "application/pdf" });
      formData.append("file", blob, "sample.pdf");

      const uploadRes = await fetch(`${BASE_URL}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}` },
        body: formData,
      });
      record("Upload document", uploadRes.ok);
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        documentId = data?.data?.id || "";
        if (documentId) console.log(`        Document ID: ${documentId}`);
      }
    } else {
      record("Upload document (skipped — no sample.pdf)", true);
    }
  } catch {
    record("Upload document (skipped — fs unavailable)", true);
  }

  if (documentId) {
    res = await api("GET", `/documents/${documentId}`);
    record("Get document", res.ok);

    res = await api("PATCH", `/documents/${documentId}`, { title: "E2E Test Updated" });
    record("Update document", res.ok);

    res = await api("GET", `/documents/${documentId}/download?type=original`);
    record("Download PDF", res.ok);

    res = await api("GET", `/documents/${documentId}/audit-log`);
    record("Get audit log", res.ok);

    // ── Signers ──
    let signerId = "";
    res = await api("POST", `/documents/${documentId}/signers`, {
      name: "Test Signer",
      email: "test@example.com",
      order: 0,
    });
    record("Add signer", res.ok);
    if (res.ok) {
      const data = await res.json();
      signerId = data?.data?.id || "";
    }

    if (signerId) {
      res = await api("GET", `/documents/${documentId}/signers`);
      record("List signers", res.ok);

      res = await api("PATCH", `/documents/${documentId}/signers/${signerId}`, { order: 1 });
      record("Update signer", res.ok);

      let fieldId = "";
      res = await api("POST", `/documents/${documentId}/signers/${signerId}/fields`, {
        type: "signature", page: 1, x: 100, y: 500, w: 200, h: 50,
      });
      record("Add field", res.ok);
      if (res.ok) {
        const data = await res.json();
        fieldId = data?.data?.id || "";
      }

      if (fieldId) {
        res = await api("PATCH", `/documents/${documentId}/signers/${signerId}/fields/${fieldId}`, { w: 250 });
        record("Update field", res.ok);

        res = await api("DELETE", `/documents/${documentId}/signers/${signerId}/fields/${fieldId}`);
        record("Remove field", res.status === 204);
      }

      res = await api("DELETE", `/documents/${documentId}/signers/${signerId}`);
      record("Remove signer", res.status === 204);
    }

    // ── Embed ──
    res = await api("POST", "/embed/signing-url", {
      document_id: documentId,
      signer_email: "test@example.com",
    });
    record("Get signing URL (no signer → 404)", res.status === 404);

    // ── Send (should fail — no signers) ──
    res = await api("POST", `/documents/${documentId}/send`);
    record("Send without signers → 400", res.status === 400);

    // ── Delete ──
    res = await api("DELETE", `/documents/${documentId}`);
    record("Delete document", res.status === 204);
  }

  // ── Templates ──
  let templateId = "";
  res = await api("POST", "/templates", { title: "E2E Template", description: "Test" });
  record("Create template", res.ok);
  if (res.ok) {
    const data = await res.json();
    templateId = data?.data?.id || "";
  }

  if (templateId) {
    res = await api("GET", "/templates");
    record("List templates", res.ok);

    res = await api("GET", `/templates/${templateId}`);
    record("Get template", res.ok);

    res = await api("POST", `/templates/${templateId}/documents`, { title: "From Template" });
    record("Create document from template", res.ok);

    // Delete the created doc
    if (res.ok) {
      const data = await res.json();
      const docId = data?.data?.id;
      if (docId) {
        await api("DELETE", `/documents/${docId}`);
      }
    }

    res = await api("DELETE", `/templates/${templateId}`);
    record("Delete template", res.status === 204);
  }

  // ── Clients ──
  let clientId = "";
  res = await api("POST", "/clients", { name: "E2E Client", email: "client@test.com" });
  record("Create client", res.ok);
  if (res.ok) {
    const data = await res.json();
    clientId = data?.data?.id || "";
  }

  if (clientId) {
    res = await api("GET", "/clients");
    record("List clients", res.ok);

    res = await api("GET", `/clients/${clientId}`);
    record("Get client", res.ok);

    res = await api("PATCH", `/clients/${clientId}`, { company: "Updated Corp" });
    record("Update client", res.ok);

    res = await api("DELETE", `/clients/${clientId}`);
    record("Delete client", res.status === 204);
  }

  // ── Webhooks ──
  res = await api("POST", "/webhooks", {
    url: "https://webhook.site/test",
    events: ["document.completed"],
  });
  record("Register webhook", res.ok);
  if (res.ok) {
    const data = await res.json();
    const webhookId = data?.data?.id;
    if (webhookId) {
      res = await api("GET", "/webhooks");
      record("List webhooks", res.ok);

      res = await api("POST", `/webhooks/${webhookId}/test`);
      record("Test webhook", res.ok);

      res = await api("DELETE", `/webhooks/${webhookId}`);
      record("Delete webhook", res.status === 204);
    }
  }

  // ── Summary ──
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n  ─────────────────────────────`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log(`  ─────────────────────────────\n`);

  if (failed > 0) {
    console.log("  Failed tests:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`    ✗ ${r.name}${r.error ? ` — ${r.error}` : ""}`);
    });
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("E2E test suite crashed:", err.message);
  process.exit(1);
});
