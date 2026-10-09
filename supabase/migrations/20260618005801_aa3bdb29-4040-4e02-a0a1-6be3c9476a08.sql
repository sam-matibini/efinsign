
CREATE OR REPLACE FUNCTION public.get_org_member_emails(_org_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  ) AND NOT public.has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  RETURN QUERY
    SELECT om.user_id, COALESCE(u.email, '')::text
    FROM public.organization_members om
    LEFT JOIN auth.users u ON u.id = om.user_id
    WHERE om.organization_id = _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_member_emails(uuid) TO authenticated;
