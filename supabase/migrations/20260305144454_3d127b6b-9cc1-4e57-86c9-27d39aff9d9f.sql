ALTER TABLE public.document_signers
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days');

UPDATE public.document_signers
SET expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL;