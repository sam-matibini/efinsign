import { supabase } from "@/integrations/supabase/client";

export function nextEditedPath(filePath: string, organizationId?: string | null, userId?: string | null): string {
  if (organizationId) {
    const owner = userId || "editor";
    return `${organizationId}/${owner}/${Date.now()}-edited.pdf`;
  }
  const slash = filePath.lastIndexOf("/");
  const folder = slash >= 0 ? filePath.slice(0, slash + 1) : "";
  return `${folder}${Date.now()}-edited.pdf`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(buf.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function tryStore(path: string, blob: Blob): Promise<Error | null> {
  const options = { contentType: "application/pdf", upsert: true as const };
  const uploaded = await supabase.storage.from("documents").upload(path, blob, options);
  if (!uploaded.error) return null;
  const updated = await supabase.storage.from("documents").update(path, blob, options);
  if (!updated.error) return null;
  return uploaded.error ?? updated.error ?? new Error("Could not write PDF to storage");
}

/**
 * Persist an edited PDF. Tries client storage first (upsert / org-scoped insert),
 * then a service-role edge function so Save still works when UPDATE RLS is missing.
 */
export async function saveEditedPdfBlob(
  documentId: string,
  filePath: string,
  blob: Blob,
  extras?: { organizationId?: string | null; userId?: string | null },
): Promise<string> {
  const inPlace = await tryStore(filePath, blob);
  if (!inPlace) {
    await supabase.from("documents").update({ updated_at: new Date().toISOString() }).eq("id", documentId);
    return filePath;
  }

  const newPath = nextEditedPath(filePath, extras?.organizationId, extras?.userId);
  const moved = await tryStore(newPath, blob);
  if (!moved) {
    const { error: docError } = await supabase
      .from("documents")
      .update({ file_path: newPath, updated_at: new Date().toISOString() })
      .eq("id", documentId);
    if (docError) throw docError;
    await supabase.storage.from("documents").remove([filePath]);
    return newPath;
  }

  const storedPath = extras?.organizationId ? newPath : filePath;
  const { data, error } = await supabase.functions.invoke("save-edited-pdf", {
    body: {
      documentId,
      filePath: storedPath,
      pdfBase64: await blobToBase64(blob),
    },
  });
  if (error) throw new Error(error.message || inPlace.message);
  if (data?.error) throw new Error(data.error);
  return storedPath;
}
