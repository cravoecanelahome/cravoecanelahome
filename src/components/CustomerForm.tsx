import { useState } from "react";
import { saveCustomer, type Customer } from "@/lib/store";

export function CustomerForm({ initial, onDone, onCancel }: { initial?: Partial<Customer>; onDone: (c: Customer) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? "", whatsapp: initial?.whatsapp ?? "", birthday: initial?.birthday ?? "",
    address: initial?.address ?? "", notes: initial?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || busy) return;
    setBusy(true);
    try {
      const c = await saveCustomer({ ...f, ...(initial?.id ? { id: initial.id } : {}) });
      onDone(c);
    } catch { alert("Não foi possível salvar o cliente."); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">Nome *</span><input required value={f.name} onChange={set("name")} className="inp" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">WhatsApp</span><input inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} className="inp" placeholder="(00) 00000-0000" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">Aniversário</span><input type="date" value={f.birthday} onChange={set("birthday")} className="inp" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">Endereço / Bairro</span><input value={f.address} onChange={set("address")} className="inp" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">Anotações / Gostos</span><textarea value={f.notes} onChange={set("notes")} rows={3} className="inp" /></label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-border py-3 font-bold">Cancelar</button>
        <button disabled={busy} className="flex-1 rounded-2xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60">Salvar</button>
      </div>
    </form>
  );
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
