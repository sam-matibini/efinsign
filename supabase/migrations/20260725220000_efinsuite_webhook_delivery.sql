-- Reliable webhook delivery for the eFinSuite integration.
--
-- Problem this fixes: when a signer completes a document, a trigger enqueues a
-- webhook delivery (document.signer_signed / document.completed), but nothing
-- flushed the queue on signing (dispatch-webhooks was only invoked on send/void).
-- As a result eFinSuite never received the "completed" event and never reflected
-- the signed status. This migration:
--   1. Adds signer_id to signer webhook payloads so receivers can match the signer.
--   2. Schedules a pg_cron job that flushes the delivery queue every minute.

-- ── 1. Enrich the payload: include signer_id on signer events ─────────────────
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
            'signer_id', NEW.id,
            'signer_email', NEW.email,
            'signer_name', NEW.name,
            'signed_at', NEW.signed_at
          );
        WHEN 'declined' THEN
          v_payload := jsonb_build_object(
            'event', 'document.signer_declined',
            'document_id', NEW.document_id,
            'signer_id', NEW.id,
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

-- ── 2. Flush the delivery queue every minute via pg_cron ──────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule so this migration is idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flush-webhook-deliveries') THEN
    PERFORM cron.unschedule('flush-webhook-deliveries');
  END IF;
END $$;

-- dispatch-webhooks is deployed with verify_jwt = false, so no auth header is needed.
-- It processes up to 50 pending deliveries per run and is safe to call repeatedly.
SELECT cron.schedule(
  'flush-webhook-deliveries',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://cavdivfhszrnhliyafze.supabase.co/functions/v1/dispatch-webhooks',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);
