CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email','')) = 'juniorrefundini10@gmail.com' AND public.is_admin()
$$;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

DROP POLICY IF EXISTS "Admins manage team" ON public.team_members;
CREATE POLICY "Owner manages team" ON public.team_members FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL CHECK (agent IN ('gerente','estoque')),
  author text NOT NULL CHECK (author IN ('user','assistant')),
  content text NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins use agent chat" ON public.agent_messages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('entrada','saida')),
  qty integer NOT NULL CHECK (qty > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  freight numeric NOT NULL DEFAULT 0,
  note text,
  source text NOT NULL DEFAULT 'agente',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage movements" ON public.stock_movements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());