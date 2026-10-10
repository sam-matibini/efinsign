import { supabase } from "@/integrations/supabase/client";

function nextEditedPath(filePath: string): string {
  const slash = filePath.lastIndexOf("/");
  const folder = slash >= 0 ? filePath.slice(0, slash + 1) : "";
  return `${folder}${Date.now()}-edited.pdf`;
}

/**
 * Overwrite a document PDF. Prefer in-place update; if storage RLS blocks
 * upsert (no UPDATE policy), write a new object (INSERT) and retarget the row.
 */
export async function saveEditedPdfBlob(
  documentId: string,
  filePath: string,
  blob: Blob,
): Promise<void> {
  const options = { contentType: "application/pdf", upsert: true as const };

  const { error: overwriteError } = await supabase.storage
    .from("documents")
    .update(filePath, blob, options);

  if (!overwriteError) {
    await supabase.from("documents").update({ updated_at: new Date().toISOString() }).eq("id", documentId);
    return;
  }

  const newPath = nextEditedPath(filePath);
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(newPath, blob, options);

  if (uploadError) {
    throw overwriteError;
  }

  const { error: docError } = await supabase
    .from("documents")
    .update({ file_path: newPath })
    .eq("id", documentId);

  if (docError) {
    await supabase.storage.from("documents").remove([newPath]);
    throw docError;
  }

  await supabase.storage.from("documents").remove([filePath]);
}
