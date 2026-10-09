CREATE POLICY "Org members can view signed PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'signed'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.signed_file_path = storage.objects.name
      AND (d.owner_id = auth.uid() OR d.organization_id IN (SELECT get_user_org_ids(auth.uid())))
  )
);

CREATE POLICY "Anon signers can view signed PDFs"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'signed'
);