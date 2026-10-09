
-- List all platform admins with profile info
CREATE OR REPLACE FUNCTION public.admin_list_platform_admins()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT ur.user_id, COALESCE(p.full_name, 'Unknown')::text as full_name
    FROM user_roles ur
    LEFT JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'platform_admin';
END;
$$;

-- Search users by name (for granting roles)
CREATE OR REPLACE FUNCTION public.admin_search_users(_query text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.user_id, COALESCE(p.full_name, '')::text as full_name
    FROM profiles p
    WHERE p.full_name ILIKE '%' || _query || '%'
    LIMIT 20;
END;
$$;

-- Grant platform_admin role
CREATE OR REPLACE FUNCTION public.admin_grant_role(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO user_roles (user_id, role) VALUES (_target_user_id, 'platform_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Revoke platform_admin role (cannot revoke own role)
CREATE OR REPLACE FUNCTION public.admin_revoke_role(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;
  DELETE FROM user_roles WHERE user_id = _target_user_id AND role = 'platform_admin';
END;
$$;
