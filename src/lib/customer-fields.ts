import { z } from "zod";

export const digits = (value: string) => value.replace(/\D/g, "");

export function formatPhone(value: string) {
  const d = digits(value).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length === 11 ? 7 : 6)}-${d.slice(d.length === 11 ? 7 : 6)}`;
}

export function formatCep(value: string) {
  const d = digits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function titleCase(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR")
    .replace(/(^|[\s'/-])([\p{L}])/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase("pt-BR"));
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && date <= new Date();
}

export const customerInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome completo.").max(100),
  whatsapp: z.string().refine((v) => !v || /^\(\d{2}\) \d{4,5}-\d{4}$/.test(v), "Use (XX) XXXXX-XXXX ou (XX) XXXX-XXXX."),
  birthday: z.string().refine((v) => !v || validDate(v), "Confira o dia, mês e ano do aniversário."),
  street: z.string().trim().max(150),
  addressNumber: z.string().trim().max(20),
  addressComplement: z.string().trim().max(100),
  city: z.string().trim().max(100),
  state: z.string().trim().refine((v) => !v || /^[A-Z]{2}$/.test(v), "Selecione um estado."),
  postalCode: z.string().refine((v) => !v || /^\d{5}-\d{3}$/.test(v), "Use o CEP 00000-000."),
  notes: z.string().trim().max(1000),
}).refine((v) => !v.addressNumber || !!v.street, { path: ["street"], message: "Informe a rua ou avenida." });

export type CustomerInput = z.infer<typeof customerInputSchema>;