## Goal
Make the **signer review screen** and **Download Signed Copy** features actually visible to signers.

## Root cause
The code is already in `src/pages/Sign.tsx`:
- Review gate: lines 586–699 (`if (!reviewed) return <ReviewScreen>`).
- Download button + handler: lines 497–541, rendered inside the "Document Signed!" card at line 553.

If the `/sign?token=…` page jumps straight to the fields, the public URL is serving an older deployed bundle. The Lovable preview and the published site are independent — edits show in the preview immediately but the published custom domain (efinsign.ca) needs to be re-published.

## Plan

### 1. Re-publish the app
Trigger a publish so `efinsign.ca` serves the current `Sign.tsx`. After publishing, open the signer link in an incognito window (to bypass cached JS) and confirm:
- Review screen appears first with the PDF preview, sender, consent checkbox, and Start signing button.
- After signing, the success card shows the **Download Signed Copy** button and the download succeeds.

### 2. Harden the review screen so it can never be silently skipped
Even if a future deploy lag happens again, the review screen should not collapse. Update `src/pages/Sign.tsx`:
- Render the review screen unconditionally when `signer.status === "pending"` and `!reviewed`, regardless of whether `pdfUrl` finished loading — show a clear "Preview unavailable" state with a Retry button instead of an empty card.
- Keep the **Start signing** button enabled when the PDF fails to load, but show a confirmation dialog ("Document preview failed to load — sign anyway?") so signers are never blocked.

### 3. Make Download Signed Copy resilient
In the success card download handler:
- If `get-signing-pdf` with `variant: "signed"` returns 404, fall back once to regenerating via `generateAndUploadSignedPdf`, then retry the fetch.
- Surface server error messages from `get-signing-pdf` / `upload-signed-pdf` in the toast instead of a generic message.

### 4. Verify edge functions are deployed
Confirm `get-signing-pdf` and `upload-signed-pdf` are deployed (they exist under `supabase/functions/`). Call each with a known-good signer token and confirm a signed URL / 200 response. If either is missing, redeploy.

### 5. Manual end-to-end check
Send a test document to a signer email, click the link in incognito, confirm:
- Review screen shows.
- Consent → Start signing → fields → Submit.
- Success card → Download Signed Copy returns the signed PDF with applied signatures.

## Out of scope
- Owner-side review/download flow (already works on `DocumentDetail`).
- Changes to the PDF rendering pipeline itself.
