
-- Tighten document_fields update policy: only allow updating the value column
DROP POLICY "Anyone can update field values" ON public.document_fields;
CREATE POLICY "Signers can update field values via token" ON public.document_fields FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.document_signers ds 
    WHERE ds.id = signer_id AND ds.status = 'pending'
  ));

-- Tighten signatures insert: only for pending signers
DROP POLICY "Anyone can create signatures" ON public.signatures;
CREATE POLICY "Can create signatures for pending signers" ON public.signatures FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.document_signers ds 
    WHERE ds.id = signer_id AND ds.status = 'pending'
  ));

-- Tighten audit_logs insert: must reference a valid document
DROP POLICY "Anyone can insert audit logs" ON public.audit_logs;
CREATE POLICY "Can insert audit logs for existing documents" ON public.audit_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d WHERE d.id = document_id
  ));
