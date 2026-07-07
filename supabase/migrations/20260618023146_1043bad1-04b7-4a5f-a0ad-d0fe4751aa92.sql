CREATE OR REPLACE FUNCTION public.admin_grant_role_by_email(_email text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_platform_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user with that email';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'platform_admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT COALESCE(p.full_name, '')::text INTO v_name
  FROM public.profiles p WHERE p.user_id = v_user_id;

  RETURN QUERY SELECT v_user_id, COALESCE(v_name, '')::text;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_role_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_role_by_email(text) TO service_role;