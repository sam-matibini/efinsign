DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

CREATE POLICY "Org members can upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Org members can view documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
);

CREATE POLICY "Org members can delete documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_org_ids(auth.uid()))
);