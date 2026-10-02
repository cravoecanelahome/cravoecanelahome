CREATE OR REPLACE FUNCTION public.is_owner() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email','')) = 'juniorrefundini10@gmail.com' AND public.is_admin()
$$;