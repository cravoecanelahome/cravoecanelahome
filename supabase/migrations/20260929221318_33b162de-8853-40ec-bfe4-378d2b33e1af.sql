CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  role public.app_role NOT NULL DEFAULT 'vendedor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX team_members_email_key ON public.team_members (lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER t_team_upd BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.team_members WHERE lower(email) = lower(auth.jwt() ->> 'email') LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.current_app_role() = 'admin', false)
$$;
REVOKE EXECUTE ON FUNCTION public.current_app_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "Admins manage team" ON public.team_members FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Members read own row" ON public.team_members FOR SELECT TO authenticated USING (lower(email) = lower(auth.jwt() ->> 'email'));

INSERT INTO public.team_members (email, name, role) VALUES
  ('juniorrefundini10@gmail.com', 'Junior', 'admin'),
  ('valdireneregina@hotmail.com', 'Valdirene', 'admin'),
  ('cravoecanelaconchal@gmail.com', 'Loja', 'vendedor');

DROP POLICY "Team manages products" ON public.products;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY "Team manages sales" ON public.sales;
CREATE POLICY "Admins manage sales" ON public.sales FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY "Team reads fees" ON public.fee_settings;
DROP POLICY "Team updates fees" ON public.fee_settings;
CREATE POLICY "Admins read fees" ON public.fee_settings FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins update fees" ON public.fee_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.catalog()
RETURNS TABLE (id uuid, name text, category text, photo text, stock integer, min_stock integer, price numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_app_role() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT p.id, p.name, p.category, p.photo, p.stock, p.min_stock, p.price FROM public.products p ORDER BY p.name;
END; $$;

CREATE OR REPLACE FUNCTION public.today_sales()
RETURNS TABLE (id uuid, product_name text, qty integer, unit_price numeric, payment text, installments integer, channel text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_app_role() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT s.id, s.product_name, s.qty, s.unit_price, s.payment, s.installments, s.channel, s.created_at
    FROM public.sales s WHERE s.created_at >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
    ORDER BY s.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.register_sale(_product_id uuid, _qty integer, _payment text, _installments integer, _channel text, _fee_rate numeric, _shipping_cost numeric, _shipping_paid_by text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE p public.products; f public.fee_settings; rate numeric := 0; sid uuid; inst integer := GREATEST(_installments, 1);
BEGIN
  IF public.current_app_role() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _qty < 1 THEN RAISE EXCEPTION 'invalid qty'; END IF;
  SELECT * INTO f FROM public.fee_settings WHERE id = 1;
  rate := CASE _payment
    WHEN 'Pix' THEN coalesce(f.pix, 0)
    WHEN 'Débito' THEN coalesce(f.debit, 0)
    WHEN 'Crédito' THEN coalesce(f.credit, 0)
    WHEN 'Parcelado' THEN coalesce(f.installment_base, 0) + coalesce(f.installment_per, 0) * GREATEST(0, inst - 2)
    ELSE 0 END;
  UPDATE public.products SET stock = stock - _qty WHERE id = _product_id AND stock >= _qty RETURNING * INTO p;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
  INSERT INTO public.sales (product_id, product_name, qty, unit_price, unit_cost, payment, installments, channel, fee_rate, fee_value, shipping_cost, shipping_paid_by)
  VALUES (p.id, p.name, _qty, p.price, p.real_cost, _payment, inst, _channel, rate,
          round(p.price * _qty * rate / 100, 2), GREATEST(_shipping_cost, 0), NULLIF(_shipping_paid_by, ''))
  RETURNING id INTO sid;
  RETURN sid;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.catalog() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.today_sales() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.register_sale(uuid, integer, text, integer, text, numeric, numeric, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.today_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_sale(uuid, integer, text, integer, text, numeric, numeric, text) TO authenticated;