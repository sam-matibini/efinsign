
CREATE OR REPLACE FUNCTION public.admin_assign_org_plan(
  _org_id uuid,
  _plan_id uuid,
  _plan_name text,
  _source text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.org_subscriptions (organization_id, plan_id, plan_name, status, source, activated_at, updated_at)
  VALUES (_org_id, _plan_id, _plan_name, 'active', _source, now(), now())
  ON CONFLICT (organization_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        plan_name = EXCLUDED.plan_name,
        status = 'active',
        source = EXCLUDED.source,
        activated_at = now(),
        updated_at = now();
END;
$$;
