ALTER TABLE public.customers
  ADD COLUMN street text,
  ADD COLUMN address_number text,
  ADD COLUMN address_complement text,
  ADD COLUMN city text,
  ADD COLUMN state text,
  ADD COLUMN postal_code text;