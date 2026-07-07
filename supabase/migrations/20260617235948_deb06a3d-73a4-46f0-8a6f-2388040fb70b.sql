
CREATE OR REPLACE FUNCTION public.get_org_seat_usage(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_users int;
  _members int;
  _pending int;
  _plan_name text;
  _has_sub boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  ) AND NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  SELECT pp.max_users, os.plan_name, true
    INTO _max_users, _plan_name, _has_sub
  FROM org_subscriptions os
  LEFT JOIN pricing_plans pp ON pp.id = os.plan_id
  WHERE os.organization_id = _org_id AND os.status = 'active'
  LIMIT 1;

  SELECT count(*)::int INTO _members
  FROM organization_members WHERE organization_id = _org_id;

  SELECT count(*)::int INTO _pending
  FROM org_invitations
  WHERE organization_id = _org_id
    AND status = 'pending'
    AND expires_at > now();

  RETURN jsonb_build_object(
    'has_subscription', COALESCE(_has_sub, false),
    'plan_name', _plan_name,
    'max_users', _max_users,
    'members', _members,
    'pending_invites', _pending,
    'used', _members + _pending,
    'remaining', CASE WHEN _max_users IS NULL THEN NULL
                      ELSE GREATEST(_max_users - (_members + _pending), 0) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_seat_usage(uuid) TO authenticated;
