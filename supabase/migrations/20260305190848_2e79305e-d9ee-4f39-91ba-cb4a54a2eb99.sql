
CREATE TYPE public.app_role AS ENUM ('platform_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_organizations', (SELECT count(*) FROM organizations),
    'total_documents', (SELECT count(*) FROM documents),
    'documents_completed', (SELECT count(*) FROM documents WHERE status = 'completed'),
    'documents_pending', (SELECT count(*) FROM documents WHERE status = 'pending'),
    'documents_this_month', (SELECT count(*) FROM documents WHERE created_at >= date_trunc('month', now())),
    'total_users', (SELECT count(DISTINCT user_id) FROM organization_members),
    'total_signatures', (SELECT count(*) FROM signatures)
  ) INTO result;

  RETURN result;
END;
$$;
