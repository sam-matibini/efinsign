CREATE OR REPLACE FUNCTION public.admin_update_user_name(_user_id uuid, _full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_platform_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (_user_id, COALESCE(NULLIF(trim(_full_name), ''), ''))
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), ''),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_name(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_name(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_name(uuid, text) TO service_role;