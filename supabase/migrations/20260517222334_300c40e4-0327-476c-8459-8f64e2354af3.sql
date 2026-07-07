
CREATE TABLE IF NOT EXISTS public.org_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  plan_id uuid NOT NULL,
  plan_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'demo',
  activated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view subscription"
ON public.org_subscriptions FOR SELECT TO authenticated
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Platform admins can insert subscription"
ON public.org_subscriptions FOR INSERT TO authenticated
WITH CHECK (has_platform_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update subscription"
ON public.org_subscriptions FOR UPDATE TO authenticated
USING (has_platform_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete subscription"
ON public.org_subscriptions FOR DELETE TO authenticated
USING (has_platform_role(auth.uid(), 'platform_admin'::app_role));
