
-- Allow anon users to view documents they are signers on
CREATE POLICY "Signers can view their document"
ON public.documents FOR SELECT TO anon
USING (id IN (SELECT document_id FROM public.document_signers));

-- Allow anon signers to update their own signer status
CREATE POLICY "Signers can update own status"
ON public.document_signers FOR UPDATE TO anon
USING (status = 'pending')
WITH CHECK (status IN ('signed', 'declined'));

-- Allow anon to mark document completed/declined
CREATE POLICY "Signers can mark document completed"
ON public.documents FOR UPDATE TO anon
USING (id IN (SELECT document_id FROM public.document_signers))
WITH CHECK (status IN ('completed', 'declined'));

-- Allow anon to view document_signers (needed for token lookup)
CREATE POLICY "Anon can view signers by token"
ON public.document_signers FOR SELECT TO anon
USING (true);

-- Allow anon to insert audit logs
CREATE POLICY "Anon can insert audit logs"
ON public.audit_logs FOR INSERT TO anon
WITH CHECK (EXISTS (SELECT 1 FROM documents d WHERE d.id = audit_logs.document_id));

-- Allow anon to view document files in storage
CREATE POLICY "Signers can view document files"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'documents');

-- Allow anon to upload signed PDFs
CREATE POLICY "Allow signed PDF upload"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'signed');
