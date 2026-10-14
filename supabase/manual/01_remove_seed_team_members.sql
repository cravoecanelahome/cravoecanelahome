-- Execução manual. Remove da equipe os dois e-mails do seed (idempotente).
BEGIN;

DELETE FROM public.team_members
WHERE lower(email) IN ('valdireneregina@hotmail.com', 'cravoecanelaconchal@gmail.com');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE lower(email) IN ('valdireneregina@hotmail.com', 'cravoecanelaconchal@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Ainda existem linhas desses e-mails em team_members';
  END IF;
END $$;

COMMIT;
