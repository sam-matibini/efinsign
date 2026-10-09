
CREATE OR REPLACE FUNCTION public.signer_token()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  v := NULLIF(COALESCE(NULLIF(current_setting('request.headers', true), '')::json->>'x-signer-token',''),'');
  IF v IS NULL THEN RETURN NULL; END IF;
  BEGIN
    RETURN v::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.signer_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signer_token() TO anon, authenticated, service_role;

-- document_signers
DROP POLICY IF EXISTS "Anon can view signers by token" ON public.document_signers;
DROP POLICY IF EXISTS "Signers can view their assignments" ON public.document_signers;
DROP POLICY IF EXISTS "Signers can update own status" ON public.document_signers;

CREATE POLICY "Anon signer can view own row"
ON public.document_signers FOR SELECT TO anon
USING (public.signer_token() IS NOT NULL AND access_token = public.signer_token());

CREATE POLICY "Anon signer can update own status"
ON public.document_signers FOR UPDATE TO anon
USING (
  status = 'pending'
  AND public.signer_token() IS NOT NULL
  AND access_token = public.signer_token()
)
WITH CHECK (
  access_token = public.signer_token()
  AND status = ANY (ARRAY['signed','declined'])
);

-- document_fields
DROP POLICY IF EXISTS "Anyone can view fields" ON public.document_fields;
DROP POLICY IF EXISTS "Anon signers can update field values" ON public.document_fields;
DROP POLICY IF EXISTS "Signers can update field values via token" ON public.document_fields;

CREATE POLICY "Anon signer can view own fields"
ON public.document_fields FOR SELECT TO anon
USING (
  public.signer_token() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.id = document_fields.signer_id
      AND ds.access_token = public.signer_token()
  )
);

CREATE POLICY "Org members can view fields"
ON public.document_fields FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_fields.document_id
      AND (
        d.owner_id = auth.uid()
        OR d.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
      )
  )
);

CREATE POLICY "Anon signer can update own fields"
ON public.document_fields FOR UPDATE TO anon
USING (
  public.signer_token() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.id = document_fields.signer_id
      AND ds.status = 'pending'
      AND ds.access_token = public.signer_token()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.id = document_fields.signer_id
      AND ds.access_token = public.signer_token()
  )
);

-- documents
DROP POLICY IF EXISTS "Signers can view their document" ON public.documents;
DROP POLICY IF EXISTS "Signers can mark document completed" ON public.documents;

CREATE POLICY "Anon signer can view their document"
ON public.documents FOR SELECT TO anon
USING (
  public.signer_token() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.document_id = documents.id
      AND ds.access_token = public.signer_token()
  )
);

CREATE POLICY "Anon signer can update their document"
ON public.documents FOR UPDATE TO anon
USING (
  public.signer_token() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.document_id = documents.id
      AND ds.access_token = public.signer_token()
  )
)
WITH CHECK (
  status = ANY (ARRAY['completed','declined','pending'])
  AND EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.document_id = documents.id
      AND ds.access_token = public.signer_token()
  )
);

-- signatures
DROP POLICY IF EXISTS "Anyone can view signatures" ON public.signatures;
DROP POLICY IF EXISTS "Can create signatures for pending signers" ON public.signatures;

CREATE POLICY "Anon signer can view own signature"
ON public.signatures FOR SELECT TO anon
USING (
  public.signer_token() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.id = signatures.signer_id
      AND ds.access_token = public.signer_token()
  )
);

CREATE POLICY "Org members can view signatures"
ON public.signatures FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.document_signers ds
    JOIN public.documents d ON d.id = ds.document_id
    WHERE ds.id = signatures.signer_id
      AND (
        d.owner_id = auth.uid()
        OR d.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
      )
  )
);

CREATE POLICY "Anon signer can insert own signature"
ON public.signatures FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.id = signatures.signer_id
      AND ds.status = 'pending'
      AND ds.access_token = public.signer_token()
  )
);

CREATE POLICY "Owners can insert signatures"
ON public.signatures FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.document_signers ds
    JOIN public.documents d ON d.id = ds.document_id
    WHERE ds.id = signatures.signer_id
      AND d.owner_id = auth.uid()
  )
);

-- audit_logs
DROP POLICY IF EXISTS "Can insert audit logs for existing documents" ON public.audit_logs;
DROP POLICY IF EXISTS "Anon can insert audit logs" ON public.audit_logs;

CREATE POLICY "Anon signer can insert audit logs for their document"
ON public.audit_logs FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.document_signers ds
    WHERE ds.document_id = audit_logs.document_id
      AND ds.access_token = public.signer_token()
  )
);

CREATE POLICY "Auth users can insert audit logs for their documents"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = audit_logs.document_id
      AND (
        d.owner_id = auth.uid()
        OR d.organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
      )
  )
);

-- saved_signatures
DROP POLICY IF EXISTS "Org members can delete signatures" ON public.saved_signatures;
DROP POLICY IF EXISTS "Org members can update signatures" ON public.saved_signatures;

CREATE POLICY "Users can delete own saved signatures"
ON public.saved_signatures FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own saved signatures"
ON public.saved_signatures FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- storage
DROP POLICY IF EXISTS "Signers can view document files" ON storage.objects;
DROP POLICY IF EXISTS "Anon signers can view signed PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow signed PDF upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload signatures" ON storage.objects;

CREATE POLICY "Anon signer can read their document files"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'documents'
  AND public.signer_token() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.document_signers ds ON ds.document_id = d.id
    WHERE ds.access_token = public.signer_token()
      AND (d.file_path = name OR d.signed_file_path = name)
  )
);

CREATE POLICY "Anon signer can upload signed PDF for their document"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'signed'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.document_signers ds ON ds.document_id = d.id
    WHERE ds.access_token = public.signer_token()
      AND name = 'signed/' || d.id::text || '.pdf'
  )
);

CREATE POLICY "Auth users can upload signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Anon signers can upload signatures with token"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'signatures'
  AND public.signer_token() IS NOT NULL
);

-- Trim EXECUTE grants
REVOKE EXECUTE ON FUNCTION public.admin_assign_org_plan(uuid,uuid,text,text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_organization(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_delete_pricing_plan(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_document_analytics() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_get_organization_detail(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_grant_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_organizations() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_platform_admins() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_pricing_plans() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_search_users(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_organization(uuid,text,text,text,text,text,text,text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_pricing_plan(uuid,text,integer,text,text,integer,integer,jsonb,boolean,integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_organization_with_admin(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_metrics() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_org_member_emails(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_org_seat_usage(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_org_ids(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid,uuid,public.org_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_platform_role(uuid,public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_org() FROM anon, authenticated, PUBLIC;
