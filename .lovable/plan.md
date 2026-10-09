## Problem

Saved signatures in Fill & Sign are scoped to the **organization**, not the user. When the Zambia admin opens a document, they see your signature/initials because both queries filter only by `organization_id`. Signatures need to be per-user so each member (admin or otherwise) has their own.

## Fix

Scope every `saved_signatures` read/write by the currently signed-in `user_id` in addition to `organization_id`.

### `src/pages/DocumentPrepare.tsx`
- Load query (~L138): add `.eq("user_id", user.id)` so only the current user's signatures load.
- `persistSignature` / `persistInitials`: already insert with `user_id: user.id` — no change.
- `deleteSavedSig`: add `.eq("user_id", user.id)` as a safety guard.

### `src/pages/OrgSettings.tsx` (Signatures tab)
- `fetchSignatures` (~L366): add `.eq("user_id", user.id)`.
- `handleSetDefault` (~L395): scope the "clear defaults" update with `.eq("user_id", user.id)` so it only resets the current user's defaults.
- `handleRenameSig` / `handleDeleteSig`: add `.eq("user_id", user.id)` guard.
- UI copy: rename the tab/heading from any "Organization Signatures" wording to "My Signatures" so it's clear these are personal.

### No DB migration
The `saved_signatures` table already has `user_id`. RLS presumably already permits per-user access; we're just tightening the client queries so users no longer see each other's signatures. If after this change the Zambia admin still sees nothing where they should see their own, we'll revisit RLS in a follow-up.

## Verification
- Sign in as the Zambia admin → open a document → Fill & Sign shows empty "Add Signature" / "Add Initials" until they create their own.
- Sign in as the owner → still sees only the owner's signatures.
- Org Settings → Signatures tab shows only the current user's saved signatures.
