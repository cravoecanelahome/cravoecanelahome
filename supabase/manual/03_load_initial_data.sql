-- Execução manual, uma única vez, no banco novo (regras do 2-dados-final v3).
-- Pré-requisito: a conta juniorrefundini10@gmail.com criada no painel com Auto Confirm.
-- Não regrava as taxas: apenas confere os valores padrão criados pelas migrations.
BEGIN;

DO $$
DECLARE f public.fee_settings; n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.team_members) THEN RAISE EXCEPTION 'team_members não está vazia'; END IF;
  IF EXISTS (SELECT 1 FROM public.products) THEN RAISE EXCEPTION 'products já tem linhas'; END IF;
  IF EXISTS (SELECT 1 FROM public.customers) THEN RAISE EXCEPTION 'customers já tem linhas'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales) THEN RAISE EXCEPTION 'sales já tem linhas'; END IF;
  IF EXISTS (SELECT 1 FROM public.stock_movements) THEN RAISE EXCEPTION 'stock_movements já tem linhas'; END IF;
  IF EXISTS (SELECT 1 FROM public.agent_messages) THEN RAISE EXCEPTION 'agent_messages já tem linhas'; END IF;

  SELECT * INTO f FROM public.fee_settings WHERE id = 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'fee_settings id=1 não existe'; END IF;
  IF f.debit <> 1.99 OR f.credit <> 3.49 OR f.installment_base <> 4.99 OR f.installment_per <> 1.5 OR f.pix <> 0 THEN
    RAISE EXCEPTION 'Taxas diferentes do esperado (débito 1.99, crédito 3.49, parcelado 4.99 + 1.5, Pix 0)';
  END IF;

  SELECT count(*) INTO n FROM auth.users WHERE lower(email) = 'juniorrefundini10@gmail.com';
  IF n <> 1 THEN RAISE EXCEPTION 'Esperada exatamente 1 conta juniorrefundini10@gmail.com em auth.users, encontradas %', n; END IF;
END $$;

-- INSERT simples: uma segunda execução falha pelo índice único de e-mail.
INSERT INTO public.team_members (email, name, role)
VALUES ('juniorrefundini10@gmail.com', 'Junior', 'admin');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.team_members) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.team_members WHERE email = 'juniorrefundini10@gmail.com' AND role = 'admin') THEN
    RAISE EXCEPTION 'Verificação final falhou: equipe deveria ter só o responsável como admin';
  END IF;
END $$;

COMMIT;
