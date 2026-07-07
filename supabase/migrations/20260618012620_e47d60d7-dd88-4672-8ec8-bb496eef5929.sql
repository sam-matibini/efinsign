
CREATE OR REPLACE FUNCTION public.update_document_status_on_signer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count int;
  declined_count int;
BEGIN
  IF NEW.status = 'declined' THEN
    UPDATE public.documents
      SET status = 'declined'
      WHERE id = NEW.document_id AND status <> 'declined';
    RETURN NEW;
  END IF;

  IF NEW.status = 'signed' THEN
    SELECT
      count(*) FILTER (WHERE status = 'pending'),
      count(*) FILTER (WHERE status = 'declined')
    INTO pending_count, declined_count
    FROM public.document_signers
    WHERE document_id = NEW.document_id;

    IF pending_count = 0 AND declined_count = 0 THEN
      UPDATE public.documents
        SET status = 'completed'
        WHERE id = NEW.document_id AND status <> 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_document_status ON public.document_signers;
CREATE TRIGGER trg_update_document_status
AFTER UPDATE OF status ON public.document_signers
FOR EACH ROW
EXECUTE FUNCTION public.update_document_status_on_signer_change();
