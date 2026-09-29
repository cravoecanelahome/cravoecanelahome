CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Outros',
  photo text,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 3,
  cost numeric NOT NULL DEFAULT 0,
  purchase_extra numeric NOT NULL DEFAULT 0,
  purchase_qty integer NOT NULL DEFAULT 1,
  real_cost numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  qty integer NOT NULL,
  unit_price numeric NOT NULL,
  unit_cost numeric NOT NULL,
  payment text NOT NULL,
  installments integer NOT NULL DEFAULT 1,
  channel text NOT NULL DEFAULT 'Loja física',
  fee_rate numeric NOT NULL DEFAULT 0,
  fee_value numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  shipping_paid_by text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team manages sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.fee_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  debit numeric NOT NULL DEFAULT 1.99,
  credit numeric NOT NULL DEFAULT 3.49,
  installment_base numeric NOT NULL DEFAULT 4.99,
  installment_per numeric NOT NULL DEFAULT 1.5,
  pix numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fee_settings TO authenticated;
GRANT ALL ON public.fee_settings TO service_role;
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads fees" ON public.fee_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team updates fees" ON public.fee_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
INSERT INTO public.fee_settings (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_sales_upd BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_fees_upd BEFORE UPDATE ON public.fee_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.register_sale(
  _product_id uuid, _qty integer, _payment text, _installments integer, _channel text,
  _fee_rate numeric, _shipping_cost numeric, _shipping_paid_by text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p public.products; sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _qty < 1 THEN RAISE EXCEPTION 'invalid qty'; END IF;
  UPDATE public.products SET stock = stock - _qty WHERE id = _product_id AND stock >= _qty RETURNING * INTO p;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Estoque insuficiente'; END IF;
  INSERT INTO public.sales (product_id, product_name, qty, unit_price, unit_cost, payment, installments, channel, fee_rate, fee_value, shipping_cost, shipping_paid_by)
  VALUES (p.id, p.name, _qty, p.price, p.real_cost, _payment, GREATEST(_installments,1), _channel, _fee_rate,
          round(p.price * _qty * _fee_rate / 100, 2), GREATEST(_shipping_cost,0), _shipping_paid_by)
  RETURNING id INTO sid;
  RETURN sid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.register_sale FROM anon, public;
GRANT EXECUTE ON FUNCTION public.register_sale TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.products, public.sales, public.fee_settings;