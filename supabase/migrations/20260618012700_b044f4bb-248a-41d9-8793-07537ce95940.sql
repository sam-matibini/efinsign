
CREATE OR REPLACE FUNCTION public.get_signing_render_data(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id uuid;
  result jsonb;
BEGIN
  IF p_token IS NULL THEN
    RAISE EXCEPTION 'Token required';
  END IF;

  SELECT document_id INTO v_document_id
  FROM public.document_signers
  WHERE access_token = p_token
  LIMIT 1;

  IF v_document_id IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  SELECT jsonb_build_object(
    'document_id', v_document_id,
    'fields', COALESCE((
      SELECT jsonb_agg(to_jsonb(f)) FROM public.document_fields f
      WHERE f.document_id = v_document_id
    ), '[]'::jsonb),
    'signatures', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'signer_id', s.signer_id,
        'image_data', s.image_data
      ))
      FROM public.signatures s
      JOIN public.document_signers ds ON ds.id = s.signer_id
      WHERE ds.document_id = v_document_id
    ), '[]'::jsonb),
    'signers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ds.id,
        'name', ds.name,
        'signed_at', ds.signed_at
      ))
      FROM public.document_signers ds
      WHERE ds.document_id = v_document_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signing_render_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signing_render_data(uuid) TO anon, authenticated;
