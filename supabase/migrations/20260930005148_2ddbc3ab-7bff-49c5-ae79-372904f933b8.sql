CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text,
  birthday date,
  address text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads customers" ON public.customers FOR SELECT TO authenticated USING (public.current_app_role() IS NOT NULL);
CREATE POLICY "Team adds customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.current_app_role() IS NOT NULL);
CREATE POLICY "Team edits customers" ON public.customers FOR UPDATE TO authenticated USING (public.current_app_role() IS NOT NULL) WITH CHECK (public.current_app_role() IS NOT NULL);
CREATE POLICY "Admins delete customers" ON public.customers FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER t_customers_upd BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;

ALTER TABLE public.sales ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX sales_customer_idx ON public.sales(customer_id);

DROP FUNCTION public.register_sale(uuid, integer, text, integer, text, numeric, numeric, text);
CREATE FUNCTION public.register_sale(_product_id uuid, _qty integer, _payment text, _installments integer, _channel text, _fee_rate numeric, _shipping_cost numeric, _shipping_paid_by text, _customer_id uuid DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  INSERT INTO public.sales (product_id, product_name, qty, unit_price, unit_cost, payment, installments, channel, fee_rate, fee_value, shipping_cost, shipping_paid_by, customer_id)
  VALUES (p.id, p.name, _qty, p.price, p.real_cost, _payment, inst, _channel, rate,
          round(p.price * _qty * rate / 100, 2), GREATEST(_shipping_cost, 0), NULLIF(_shipping_paid_by, ''), _customer_id)
  RETURNING id INTO sid;
  RETURN sid;
END; $function$;

CREATE FUNCTION public.customer_history(_customer_id uuid)
 RETURNS TABLE(id uuid, product_name text, qty integer, unit_price numeric, payment text, channel text, created_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.current_app_role() IS NULL THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT s.id, s.product_name, s.qty, s.unit_price, s.payment, s.channel, s.created_at
    FROM public.sales s WHERE s.customer_id = _customer_id ORDER BY s.created_at DESC;
END; $function$;