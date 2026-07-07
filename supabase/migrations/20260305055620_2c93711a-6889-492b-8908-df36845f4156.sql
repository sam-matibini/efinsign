
-- Tighten UPDATE policy to only allow setting status on pending invitations matching user email
DROP POLICY "Authenticated can accept invitations" ON public.org_invitations;
CREATE POLICY "Users can accept their invitations"
  ON public.org_invitations FOR UPDATE TO authenticated
  USING (lower(email) = lower(auth.jwt()->>'email') AND status = 'pending');
