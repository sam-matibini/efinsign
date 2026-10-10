-- Allow a signed-in user to create or update their own profile even when
-- INSERT/UPDATE policies are tighter than expected on hosted projects.
CREATE OR REPLACE FUNCTION public.upsert_own_profile(_full_name text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (auth.uid(), NULLIF(btrim(_full_name), ''))
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_own_profile(text) TO authenticated;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS seal_stamp TEXT;
