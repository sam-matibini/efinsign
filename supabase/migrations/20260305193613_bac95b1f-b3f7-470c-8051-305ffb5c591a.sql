
-- Pricing plans table
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  period text NOT NULL DEFAULT 'month',
  max_documents integer,
  max_users integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Public read access for pricing plans (shown on landing page)
CREATE POLICY "Anyone can view pricing plans" ON public.pricing_plans
  FOR SELECT USING (true);

-- List pricing plans (admin)
CREATE OR REPLACE FUNCTION public.admin_list_pricing_plans()
RETURNS TABLE(
  id uuid, name text, price_cents integer, currency text, period text,
  max_documents integer, max_users integer, features jsonb,
  highlighted boolean, sort_order integer, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY SELECT p.id, p.name, p.price_cents, p.currency, p.period,
    p.max_documents, p.max_users, p.features, p.highlighted, p.sort_order,
    p.created_at, p.updated_at
  FROM pricing_plans p ORDER BY p.sort_order;
END;
$$;

-- Upsert pricing plan (admin)
CREATE OR REPLACE FUNCTION public.admin_upsert_pricing_plan(
  _id uuid, _name text, _price_cents integer, _currency text, _period text,
  _max_documents integer, _max_users integer, _features jsonb,
  _highlighted boolean, _sort_order integer
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result_id uuid;
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _id IS NOT NULL THEN
    UPDATE pricing_plans SET name=_name, price_cents=_price_cents, currency=_currency,
      period=_period, max_documents=_max_documents, max_users=_max_users,
      features=_features, highlighted=_highlighted, sort_order=_sort_order, updated_at=now()
    WHERE id=_id RETURNING id INTO result_id;
  END IF;
  IF result_id IS NULL THEN
    INSERT INTO pricing_plans (name, price_cents, currency, period, max_documents, max_users, features, highlighted, sort_order)
    VALUES (_name, _price_cents, _currency, _period, _max_documents, _max_users, _features, _highlighted, _sort_order)
    RETURNING id INTO result_id;
  END IF;
  RETURN result_id;
END;
$$;

-- Delete pricing plan (admin)
CREATE OR REPLACE FUNCTION public.admin_delete_pricing_plan(_plan_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM pricing_plans WHERE id = _plan_id;
END;
$$;

-- Get organization detail with members (admin)
CREATE OR REPLACE FUNCTION public.admin_get_organization_detail(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT jsonb_build_object(
    'org', row_to_json(o.*),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', om.user_id,
        'role', om.role,
        'full_name', COALESCE(p.full_name, ''),
        'joined_at', om.created_at
      ) ORDER BY om.created_at)
      FROM organization_members om
      LEFT JOIN profiles p ON p.user_id = om.user_id
      WHERE om.organization_id = _org_id
    ), '[]'::jsonb)
  ) INTO result
  FROM organizations o WHERE o.id = _org_id;
  RETURN result;
END;
$$;

-- Update organization details (admin)
CREATE OR REPLACE FUNCTION public.admin_update_organization(
  _org_id uuid, _name text, _email text, _address text,
  _city text, _postal_code text, _country text, _telephone text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_platform_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE organizations SET name=_name, email=_email, address=_address,
    city=_city, postal_code=_postal_code, country=_country, telephone=_telephone
  WHERE id = _org_id;
END;
$$;
