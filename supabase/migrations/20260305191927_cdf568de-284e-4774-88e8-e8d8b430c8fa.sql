
-- List all organizations with member and document counts
CREATE OR REPLACE FUNCTION public.admin_list_organizations()
RETURNS TABLE(
  org_id uuid,
  org_name text,
  created_at timestamptz,
  member_count bigint,
  document_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      o.id,
      o.name,
      o.created_at,
      (SELECT count(*) FROM organization_members om WHERE om.organization_id = o.id),
      (SELECT count(*) FROM documents d WHERE d.organization_id = o.id)
    FROM organizations o
    ORDER BY o.created_at DESC;
END;
$$;

-- Delete an organization (platform admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_organization(_org_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM organizations WHERE id = _org_id;
END;
$$;
