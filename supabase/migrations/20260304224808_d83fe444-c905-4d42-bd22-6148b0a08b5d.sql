CREATE TABLE public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signer_id uuid NOT NULL REFERENCES document_signers(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Document owners can view notifications"
  ON public.email_notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = email_notifications.document_id AND d.owner_id = auth.uid()));