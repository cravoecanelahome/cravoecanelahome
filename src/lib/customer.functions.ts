import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { customerInputSchema, titleCase } from "@/lib/customer-fields";

export const saveCustomerRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => customerInputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const row = {
      name: titleCase(data.name), whatsapp: data.whatsapp || null, birthday: data.birthday || null,
      street: titleCase(data.street) || null, address_number: data.addressNumber || null,
      address_complement: titleCase(data.addressComplement) || null, city: titleCase(data.city) || null,
      state: data.state || null, postal_code: data.postalCode || null, notes: data.notes || null,
    };
    const columns = "id,name,whatsapp,birthday,address,street,address_number,address_complement,city,state,postal_code,notes";
    const result = data.id
      ? await context.supabase.from("customers").update(row).eq("id", data.id).select(columns).single()
      : await context.supabase.from("customers").insert(row).select(columns).single();
    if (result.error) throw result.error;
    return result.data;
  });