CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  mode text NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox', 'production')),
  scopes text[] NOT NULL DEFAULT '{}',
  usage_count integer NOT NULL DEFAULT 0,
  usage_limit integer NOT NULL DEFAULT 100,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(organization_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view api keys"
ON public.api_keys FOR SELECT TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org admins can create api keys"
ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND public.has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "Org admins can update api keys"
ON public.api_keys FOR UPDATE TO authenticated
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND public.has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "Org admins can delete api keys"
ON public.api_keys FOR DELETE TO authenticated
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  AND public.has_org_role(auth.uid(), organization_id, 'admin'::org_role)
);

CREATE POLICY "Service role full access to api keys"
ON public.api_keys TO service_role
USING (true)
WITH CHECK (true);
