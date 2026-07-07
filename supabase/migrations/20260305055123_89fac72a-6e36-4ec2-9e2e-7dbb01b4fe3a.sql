
-- Fix overly permissive org INSERT policy - restrict to authenticated users only (already done, but add user check)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix the duplicate member INSERT policy - drop the broader one, keep the self-add one
DROP POLICY IF EXISTS "Admins can add members" ON public.organization_members;
CREATE POLICY "Admins can add members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- Drop the duplicate self-add policy since it's now merged above
DROP POLICY IF EXISTS "Users can add themselves to new orgs" ON public.organization_members;
