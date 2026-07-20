CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhooks(organization_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id, attempted_at DESC);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view webhooks"
ON public.webhooks FOR SELECT TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can manage webhooks"
ON public.webhooks FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND public.has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "Org admins can update webhooks"
ON public.webhooks FOR UPDATE TO authenticated
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND public.has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "Org admins can delete webhooks"
ON public.webhooks FOR DELETE TO authenticated
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND public.has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "Service role full access webhooks"
ON public.webhooks TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Org members can view webhook deliveries"
ON public.webhook_deliveries FOR SELECT TO authenticated
USING (
  webhook_id IN (
    SELECT id FROM public.webhooks
    WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  )
);

CREATE POLICY "Service role full access deliveries"
ON public.webhook_deliveries TO service_role
USING (true) WITH CHECK (true);

-- Trigger function to queue webhook deliveries on document/signer status changes
CREATE OR REPLACE FUNCTION public.queue_webhook_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_payload jsonb;
  v_webhook record;
BEGIN
  -- Determine organization and event
  IF TG_TABLE_NAME = 'documents' THEN
    v_org_id := NEW.organization_id;

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      CASE NEW.status
        WHEN 'pending' THEN
          v_payload := jsonb_build_object(
            'event', 'document.sent',
            'document_id', NEW.id,
            'title', NEW.title,
            'sent_at', now()
          );
        WHEN 'completed' THEN
          v_payload := jsonb_build_object(
            'event', 'document.completed',
            'document_id', NEW.id,
            'title', NEW.title,
            'completed_at', now()
          );
        WHEN 'expired' THEN
          v_payload := jsonb_build_object(
            'event', 'document.voided',
            'document_id', NEW.id,
            'title', NEW.title,
            'voided_at', now()
          );
        ELSE
          RETURN NEW;
      END CASE;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'document_signers' THEN
    SELECT organization_id INTO v_org_id FROM public.documents WHERE id = NEW.document_id;

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      CASE NEW.status
        WHEN 'signed' THEN
          v_payload := jsonb_build_object(
            'event', 'document.signer_signed',
            'document_id', NEW.document_id,
            'signer_email', NEW.email,
            'signer_name', NEW.name,
            'signed_at', NEW.signed_at
          );
        WHEN 'declined' THEN
          v_payload := jsonb_build_object(
            'event', 'document.signer_declined',
            'document_id', NEW.document_id,
            'signer_email', NEW.email,
            'signer_name', NEW.name,
            'reason', NEW.decline_reason,
            'declined_at', now()
          );
        ELSE
          RETURN NEW;
      END CASE;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Queue deliveries for matching webhooks
  FOR v_webhook IN
    SELECT id FROM public.webhooks
    WHERE organization_id = v_org_id
      AND is_active = true
      AND v_payload->>'event' = ANY(events)
  LOOP
    INSERT INTO public.webhook_deliveries (webhook_id, event_type, payload)
    VALUES (v_webhook.id, v_payload->>'event', v_payload);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Apply triggers
DROP TRIGGER IF EXISTS trg_documents_webhook ON public.documents;
CREATE TRIGGER trg_documents_webhook
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_webhook_event();

DROP TRIGGER IF EXISTS trg_signers_webhook ON public.document_signers;
CREATE TRIGGER trg_signers_webhook
  AFTER UPDATE ON public.document_signers
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_webhook_event();
