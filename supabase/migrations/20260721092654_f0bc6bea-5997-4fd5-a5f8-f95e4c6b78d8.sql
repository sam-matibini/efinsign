DROP POLICY IF EXISTS "Org members can view signatures" ON public.saved_signatures;
CREATE POLICY "Users can view own saved signatures" ON public.saved_signatures
  FOR SELECT USING (user_id = auth.uid());