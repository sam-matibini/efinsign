CREATE OR REPLACE FUNCTION public.admin_update_member_name(_org_id uuid, _user_id uuid, _full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_org_role(auth.uid(), _org_id, 'admin'::org_role)
     AND NOT public.has_platform_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (_user_id, COALESCE(NULLIF(trim(_full_name), ''), ''))
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), ''),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_member_name(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_member_name(uuid, uuid, text) TO authenticated;