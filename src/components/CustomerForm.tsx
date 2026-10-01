import { useState } from "react";
import { saveCustomer, type Customer } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { customerInputSchema, formatCep, formatPhone, titleCase } from "@/lib/customer-fields";

const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const years = Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i);

export function CustomerForm({ initial, onDone, onCancel }: { initial?: Partial<Customer>; onDone: (c: Customer) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? "", whatsapp: formatPhone(initial?.whatsapp ?? ""),
    street: initial?.street ?? "", addressNumber: initial?.addressNumber ?? "",
    addressComplement: initial?.addressComplement ?? "", city: initial?.city ?? "",
    state: initial?.state ?? "", postalCode: formatCep(initial?.postalCode ?? ""), notes: initial?.notes ?? "",
  });
  const [day, setDay] = useState(initial?.birthday?.slice(8, 10) ?? "");
  const [month, setMonth] = useState(initial?.birthday?.slice(5, 7) ?? "");
  const [year, setYear] = useState(initial?.birthday?.slice(0, 4) ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if ([day, month, year].some(Boolean) && ![day, month, year].every(Boolean)) return setError("Preencha dia, mês e ano do aniversário, ou deixe todos em branco.");
    const birthday = day && month && year ? `${year}-${month}-${day}` : "";
    const parsed = customerInputSchema.safeParse({ ...f, name: titleCase(f.name), birthday, ...(initial?.id ? { id: initial.id } : {}) });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Confira os dados do cliente.");
    setError("");
    setBusy(true);
    try {
      const c = await saveCustomer(parsed.data);
      onDone(c);
    } catch { setError("Não foi possível salvar o cliente. Tente novamente."); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nome *"><input required maxLength={100} autoComplete="name" value={f.name} onChange={set("name")} onBlur={() => setF((prev) => ({ ...prev, name: titleCase(prev.name) }))} className="inp" placeholder="Nome da cliente" /></Field>
      <Field label="WhatsApp"><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={15} value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: formatPhone(e.target.value) })} className="inp" placeholder="(00) 00000-0000" /></Field>
      <fieldset><legend className="mb-1 text-sm font-semibold text-muted-foreground">Aniversário</legend>
        <div className="grid grid-cols-3 gap-2">
          <select aria-label="Dia" value={day} onChange={(e) => setDay(e.target.value)} className="inp min-w-0 !px-2"><option value="">Dia</option>{Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => <option key={v}>{v}</option>)}</select>
          <select aria-label="Mês" value={month} onChange={(e) => setMonth(e.target.value)} className="inp min-w-0 !px-2"><option value="">Mês</option>{Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((v) => <option key={v}>{v}</option>)}</select>
          <select aria-label="Ano" value={year} onChange={(e) => setYear(e.target.value)} className="inp min-w-0 !px-2"><option value="">Ano</option>{years.map((v) => <option key={v}>{v}</option>)}</select>
        </div>
      </fieldset>
      <p className="border-t border-border pt-3 text-sm font-semibold text-muted-foreground">Endereço</p>
      {initial?.address && <p className="text-sm text-muted-foreground">Endereço anterior: {initial.address}</p>}
      <Field label="Rua / Avenida"><input maxLength={150} autoComplete="address-line1" value={f.street} onChange={set("street")} onBlur={() => setF((prev) => ({ ...prev, street: titleCase(prev.street) }))} className="inp" /></Field>
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Field label="Número"><input maxLength={20} value={f.addressNumber} onChange={set("addressNumber")} className="inp min-w-0" /></Field>
        <Field label="Complemento"><input maxLength={100} autoComplete="address-line2" value={f.addressComplement} onChange={set("addressComplement")} onBlur={() => setF((prev) => ({ ...prev, addressComplement: titleCase(prev.addressComplement) }))} className="inp min-w-0" /></Field>
      </div>
      <Field label="Cidade"><input maxLength={100} autoComplete="address-level2" value={f.city} onChange={set("city")} onBlur={() => setF((prev) => ({ ...prev, city: titleCase(prev.city) }))} className="inp" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Estado"><select value={f.state} autoComplete="address-level1" onChange={set("state")} className="inp min-w-0"><option value="">Selecione</option>{states.map((uf) => <option key={uf}>{uf}</option>)}</select></Field>
        <Field label="CEP"><input inputMode="numeric" maxLength={9} autoComplete="postal-code" value={f.postalCode} onChange={(e) => setF({ ...f, postalCode: formatCep(e.target.value) })} className="inp min-w-0" placeholder="00000-000" /></Field>
      </div>
      <Field label="Anotações / Gostos"><textarea maxLength={1000} value={f.notes} onChange={set("notes")} rows={3} className="inp" /></Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="h-12 flex-1">Cancelar</Button>
        <Button type="submit" disabled={busy} className="h-12 flex-1">{busy ? "Salvando…" : "Salvar"}</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 font-display text-2xl">{title}</p>
        {children}
      </div>
    </div>
  );
}
