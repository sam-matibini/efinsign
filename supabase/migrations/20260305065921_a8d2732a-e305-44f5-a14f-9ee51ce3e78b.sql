
-- Add organization_id to saved_signatures
ALTER TABLE public.saved_signatures
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill: set organization_id from user's first org
UPDATE public.saved_signatures ss
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = ss.user_id
  ORDER BY om.created_at ASC
  LIMIT 1
);

-- Drop old RLS policy
DROP POLICY IF EXISTS "Users manage own saved signatures" ON public.saved_signatures;

-- Org members can view org signatures
CREATE POLICY "Org members can view signatures"
ON public.saved_signatures FOR SELECT TO authenticated
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Org members can insert signatures (must be own user_id)
CREATE POLICY "Org members can insert signatures"
ON public.saved_signatures FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- Org members can update org signatures
CREATE POLICY "Org members can update signatures"
ON public.saved_signatures FOR UPDATE TO authenticated
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));

-- Org members can delete org signatures
CREATE POLICY "Org members can delete signatures"
ON public.saved_signatures FOR DELETE TO authenticated
USING (organization_id IN (SELECT get_user_org_ids(auth.uid())));
