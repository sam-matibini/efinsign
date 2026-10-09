
CREATE OR REPLACE FUNCTION public.admin_get_document_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'by_status', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (SELECT status, count(*)::int as cnt FROM documents GROUP BY status) s
    ),
    'avg_signers', (
      SELECT COALESCE(round(avg(signer_count)::numeric, 1), 0)
      FROM (SELECT document_id, count(*)::numeric as signer_count FROM document_signers GROUP BY document_id) ds
    ),
    'completion_rate', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round((count(*) FILTER (WHERE status = 'completed')::numeric / count(*)::numeric) * 100, 1)
      END FROM documents
    ),
    'top_organizations', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT o.name as org_name, count(d.id)::int as doc_count
        FROM organizations o
        LEFT JOIN documents d ON d.organization_id = o.id
        GROUP BY o.id, o.name
        ORDER BY doc_count DESC
        LIMIT 10
      ) t
    ),
    'monthly_trend', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.month), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
               count(*)::int as doc_count
        FROM documents
        WHERE created_at >= date_trunc('month', now()) - interval '5 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
