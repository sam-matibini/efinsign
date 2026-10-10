-- Overwriting an existing PDF (Save PDF / upsert) inserts a new storage.objects
-- row. Authenticated users had INSERT/SELECT/DELETE on the documents bucket,
-- but no UPDATE policy, which surfaces as:
--   "new row violates row-level security policy"

DROP POLICY IF EXISTS "Org members can update documents" ON storage.objects;

CREATE POLICY "Org members can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT get_user_org_ids::text FROM public.get_user_org_ids(auth.uid())
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE (d.file_path = name OR d.signed_file_path = name)
        AND (
          d.owner_id = auth.uid()
          OR d.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
        )
    )
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT get_user_org_ids::text FROM public.get_user_org_ids(auth.uid())
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE (d.file_path = name OR d.signed_file_path = name)
        AND (
          d.owner_id = auth.uid()
          OR d.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
        )
    )
  )
);
