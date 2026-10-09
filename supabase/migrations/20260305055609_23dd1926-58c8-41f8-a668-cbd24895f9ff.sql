
-- Create org_invitations table
CREATE TABLE public.org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'viewer',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can view their org's invitations
CREATE POLICY "Org members can view invitations"
  ON public.org_invitations FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- INSERT: admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON public.org_invitations FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- UPDATE: authenticated users can accept (status update)
CREATE POLICY "Authenticated can accept invitations"
  ON public.org_invitations FOR UPDATE TO authenticated
  USING (true);

-- DELETE: admins can cancel invitations
CREATE POLICY "Admins can cancel invitations"
  ON public.org_invitations FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));
