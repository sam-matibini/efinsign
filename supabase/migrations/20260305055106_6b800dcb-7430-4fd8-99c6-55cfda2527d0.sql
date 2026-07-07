
-- 1. Create org_role enum
CREATE TYPE public.org_role AS ENUM ('admin', 'manager', 'signer', 'viewer');

-- 2. Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Add organization_id to existing tables (nullable initially)
ALTER TABLE public.documents ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.templates ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.audit_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 6. Security definer functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  );
$$;

-- 7. RLS policies for organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Admins can update their organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), id, 'admin'));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- 8. RLS policies for organization_members
CREATE POLICY "Members can view co-members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Admins can add members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE POLICY "Admins can remove members"
  ON public.organization_members FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE POLICY "Admins can update member roles"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

-- 9. RLS policies for clients
CREATE POLICY "Org members can view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can create clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- 10. Update documents RLS to also allow org-based access
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view org documents"
  ON public.documents FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update org documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete org documents"
  ON public.documents FOR DELETE TO authenticated
  USING (
    auth.uid() = owner_id
    OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create documents" ON public.documents;
CREATE POLICY "Users can create documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- 11. Update templates RLS
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
CREATE POLICY "Users can view org templates"
  ON public.templates FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
CREATE POLICY "Users can update org templates"
  ON public.templates FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;
CREATE POLICY "Users can delete org templates"
  ON public.templates FOR DELETE TO authenticated
  USING (
    auth.uid() = owner_id
    OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create templates" ON public.templates;
CREATE POLICY "Users can create templates"
  ON public.templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- 12. Update audit_logs RLS for org access
DROP POLICY IF EXISTS "Document owners can view audit logs" ON public.audit_logs;
CREATE POLICY "Org members can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = audit_logs.document_id AND d.owner_id = auth.uid()
    )
    OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  );

-- 13. Auto-create organization on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Create a default organization for the new user
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization')
  RETURNING id INTO new_org_id;

  -- Add user as admin of the new organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();

-- 14. Allow first member to be inserted by the trigger (service role)
-- The trigger runs as SECURITY DEFINER so it bypasses RLS
-- But we need a policy for users to insert themselves when creating orgs
CREATE POLICY "Users can add themselves to new orgs"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
