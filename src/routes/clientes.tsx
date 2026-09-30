import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cake, MessageCircle, Plus, Search } from "lucide-react";
import { Shell } from "@/components/Shell";
import { CustomerForm, Modal } from "@/components/CustomerForm";
import { brl, customerHistory, deleteCustomer, onlyDigits, useStore, type Customer, type HistoryItem } from "@/lib/store";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Cravo & Canela Home" },
      { name: "description", content: "Cadastro de clientes, histórico de compras e aniversariantes do mês." },
      { property: "og:title", content: "Clientes — Cravo & Canela Home" },
      { property: "og:description", content: "Conheça suas clientes e não esqueça nenhum aniversário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clientes,
});

const bday = (d: string | null) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "");

function Clientes() {
  const { customers, role } = useStore();
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(false);
  const [edit, setEdit] = useState<Partial<Customer> | null>(null);
  const [open, setOpen] = useState<Customer | null>(null);
  const cur = new Date().getMonth() + 1;
  const qd = onlyDigits(q);
  const list = customers
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (qd && onlyDigits(c.whatsapp ?? "").includes(qd)))
    .filter((c) => !month || (c.birthday && Number(c.birthday.slice(5, 7)) === cur))
    .sort((a, b) => (month ? (a.birthday ?? "").slice(8).localeCompare((b.birthday ?? "").slice(8)) : a.name.localeCompare(b.name)));

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl md:text-4xl">Clientes</h1>
        <button onClick={() => setEdit({})} className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 font-bold text-primary-foreground"><Plus className="h-5 w-5" /> Novo</button>
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou WhatsApp..." className="inp !pl-12" />
        </div>
        <button onClick={() => setMonth(!month)} className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 font-bold ${month ? "border-accent bg-accent/15 text-accent-foreground" : "border-border"}`}>
          <Cake className="h-5 w-5" /> Aniversariantes do mês
        </button>
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">{month ? "Nenhum aniversariante este mês." : "Nenhum cliente encontrado."}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <button onClick={() => setOpen(c)} className="w-full rounded-2xl border border-border bg-card p-4 text-left">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">{[c.whatsapp, c.address, c.birthday && `🎂 ${bday(c.birthday)}`].filter(Boolean).join(" · ")}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {edit && (
        <Modal title={edit.id ? "Editar cliente" : "Novo cliente"} onClose={() => setEdit(null)}>
          <CustomerForm initial={edit} onCancel={() => setEdit(null)} onDone={(c) => { setEdit(null); if (open) setOpen(c); }} />
        </Modal>
      )}
      {open && !edit && <Detail c={open} admin={role === "admin"} onClose={() => setOpen(null)} onEdit={() => setEdit(open)} />}
    </Shell>
  );
}

function Detail({ c, admin, onClose, onEdit }: { c: Customer; admin: boolean; onClose: () => void; onEdit: () => void }) {
  const [hist, setHist] = useState<HistoryItem[] | null>(null);
  useEffect(() => { customerHistory(c.id).then(setHist).catch(() => setHist([])); }, [c.id]);
  const total = (hist ?? []).reduce((s, h) => s + h.qty * Number(h.unit_price), 0);
  const wa = onlyDigits(c.whatsapp ?? "");
  return (
    <Modal title={c.name} onClose={onClose}>
      <div className="mb-4 space-y-1 text-sm">
        {c.whatsapp && <p><b>WhatsApp:</b> {c.whatsapp}</p>}
        {c.birthday && <p><b>Aniversário:</b> {bday(c.birthday)}</p>}
        {c.address && <p><b>Endereço:</b> {c.address}</p>}
        {c.notes && <p className="whitespace-pre-wrap"><b>Gostos:</b> {c.notes}</p>}
      </div>
      <div className="mb-4 flex gap-2">
        {wa && <a href={`https://wa.me/${wa.length <= 11 ? "55" + wa : wa}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ok py-3 font-bold text-primary-foreground"><MessageCircle className="h-5 w-5" /> WhatsApp</a>}
        <button onClick={onEdit} className="flex-1 rounded-2xl border border-border py-3 font-bold">Editar</button>
      </div>
      <p className="mb-2 font-display text-xl">Histórico de compras</p>
      {hist === null ? <p className="text-muted-foreground">Carregando…</p> : hist.length === 0 ? <p className="text-muted-foreground">Nenhuma compra vinculada ainda.</p> : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">{hist.length} compra(s) · total {brl(total)}</p>
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {hist.map((h) => (
              <li key={h.id} className="flex justify-between gap-2 p-3 text-sm">
                <span>{h.qty}× {h.product_name} <span className="text-muted-foreground">· {new Date(h.created_at).toLocaleDateString("pt-BR")} · {h.payment}</span></span>
                <b className="shrink-0">{brl(h.qty * Number(h.unit_price))}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      {admin && (
        <button onClick={() => { if (confirm(`Excluir ${c.name}? As vendas continuam registradas.`)) deleteCustomer(c.id).then(onClose).catch(() => alert("Não foi possível excluir.")); }}
          className="mt-4 w-full rounded-2xl py-2 text-sm font-semibold text-destructive">Excluir cliente</button>
      )}
    </Modal>
  );
}
