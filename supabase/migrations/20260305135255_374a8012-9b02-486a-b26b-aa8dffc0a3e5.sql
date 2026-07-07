
CREATE POLICY "Anon signers can update field values"
ON public.document_fields FOR UPDATE TO anon
USING (EXISTS (
  SELECT 1 FROM document_signers ds
  WHERE ds.id = document_fields.signer_id AND ds.status = 'pending'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM document_signers ds
  WHERE ds.id = document_fields.signer_id AND ds.status = 'pending'
));
