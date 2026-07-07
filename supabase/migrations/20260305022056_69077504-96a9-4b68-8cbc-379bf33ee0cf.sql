CREATE TABLE public.saved_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('signature', 'initials')),
  image_data text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved signatures" ON public.saved_signatures FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);