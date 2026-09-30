REVOKE EXECUTE ON FUNCTION public.register_sale(uuid, integer, text, integer, text, numeric, numeric, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.customer_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_sale(uuid, integer, text, integer, text, numeric, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_history(uuid) TO authenticated;