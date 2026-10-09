
-- Backfill: create organizations for existing users who don't have one
DO $$
DECLARE
  _user RECORD;
  _org_id uuid;
BEGIN
  FOR _user IN
    SELECT u.id, u.email, u.raw_user_meta_data->>'full_name' as full_name
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_members om WHERE om.user_id = u.id
    )
  LOOP
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(_user.full_name, _user.email, 'My Organization') || '''s Organization')
    RETURNING id INTO _org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (_org_id, _user.id, 'admin');

    -- Backfill documents
    UPDATE public.documents SET organization_id = _org_id WHERE owner_id = _user.id AND organization_id IS NULL;
    
    -- Backfill templates
    UPDATE public.templates SET organization_id = _org_id WHERE owner_id = _user.id AND organization_id IS NULL;
  END LOOP;
END $$;
