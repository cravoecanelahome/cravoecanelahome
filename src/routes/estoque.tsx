import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Plus, Search, Trash2, X } from "lucide-react";
import { Shell, StatusBadge } from "@/components/Shell";
import {
  brl, CATEGORIES, deleteProduct, margin, realUnitCost, resizeImage, saveProduct, stockStatus, useStore, type Product,
} from "@/lib/store";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Cravo & Canela Home" },
      { name: "description", content: "Catálogo de produtos com fotos, estoque e margem de lucro." },
      { property: "og:title", content: "Estoque — Cravo & Canela Home" },
      { property: "og:description", content: "Catálogo e controle de estoque da loja." },
    ],
  }),
  component: Estoque,
});

type Draft = Omit<Product, "id" | "realCost"> & { id?: string; realCost?: number };
const blank: Draft = { name: "", category: "Aromatizadores", stock: 0, minStock: 3, cost: 0, purchaseExtra: 0, purchaseQty: 1, price: 0 };

function Estoque() {
  const { products, role } = useStore();
  const isAdmin = role === "admin";
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todas");
  const [editing, setEditing] = useState<Draft | null>(null);

  const list = products
    .filter((p) => (cat === "Todas" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl">Estoque</h1>
        {isAdmin && <button onClick={() => setEditing({ ...blank })} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground shadow-warm">
          <Plus className="h-5 w-5" /> Novo produto
        </button>}
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className="w-full rounded-2xl border border-input bg-card py-3.5 pl-12 pr-4 text-base outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {["Todas", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          {products.length === 0 ? (isAdmin ? "Cadastre seu primeiro produto tocando em “Novo produto”." : "Nenhum produto cadastrado ainda.") : "Nenhum produto encontrado."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => {
            const m = margin(p.realCost, p.price);
            return (
              <button key={p.id} disabled={!isAdmin} onClick={() => isAdmin && setEditing(p)} className="overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:shadow-warm">
                <div className="aspect-square bg-secondary">
                  {p.photo ? <img src={p.photo} alt={p.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Camera className="h-8 w-8" /></div>}
                </div>
                <div className="space-y-1.5 p-3">
                  <StatusBadge status={stockStatus(p)} />
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category} · {p.stock} un</p>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-display text-lg text-primary">{brl(p.price)}</span>
                    {isAdmin && <span className="text-xs font-bold text-ok">{m.pct.toFixed(0)}%</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {isAdmin && editing && <ProductForm draft={editing} onClose={() => setEditing(null)} />}
    </Shell>
  );
}

function ProductForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const real = realUnitCost(d.cost, d.purchaseExtra, d.purchaseQty);
  const m = margin(real, d.price);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });
  const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 md:items-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!d.name.trim()) return;
          setSaving(true);
          saveProduct(d).then(onClose, () => { setSaving(false); alert("Não foi possível salvar. Verifique a internet."); });
        }}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 md:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{d.id ? "Editar produto" : "Novo produto"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 hover:bg-secondary"><X /></button>
        </div>

        <label className="mb-4 flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-border p-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
            {d.photo ? <img src={d.photo} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Camera className="text-muted-foreground" /></div>}
          </div>
          <span className="font-semibold text-primary">{d.photo ? "Trocar foto" : "Adicionar foto"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("photo", await resizeImage(f)); }} />
        </label>

        <Field label="Nome do produto">
          <input required value={d.name} onChange={(e) => set("name", e.target.value)} className="inp" placeholder="Ex: Vela aromática canela" />
        </Field>
        <Field label="Categoria">
          <select value={d.category} onChange={(e) => set("category", e.target.value)} className="inp">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade"><input inputMode="numeric" value={d.stock} onChange={(e) => set("stock", Math.floor(num(e.target.value)))} className="inp" /></Field>
          <Field label="Avisar quando tiver"><input inputMode="numeric" value={d.minStock} onChange={(e) => set("minStock", Math.floor(num(e.target.value)))} className="inp" /></Field>
          <Field label="Custo (nota) R$"><input inputMode="decimal" defaultValue={d.cost || ""} onChange={(e) => set("cost", num(e.target.value))} className="inp" placeholder="0,00" /></Field>
          <Field label="Frete/embalagem da compra R$"><input inputMode="decimal" defaultValue={d.purchaseExtra || ""} onChange={(e) => set("purchaseExtra", num(e.target.value))} className="inp" placeholder="0,00" /></Field>
          <Field label="Unidades nessa compra"><input inputMode="numeric" value={d.purchaseQty} onChange={(e) => set("purchaseQty", Math.max(1, Math.floor(num(e.target.value))))} className="inp" /></Field>
          <Field label="Preço de venda R$"><input inputMode="decimal" defaultValue={d.price || ""} onChange={(e) => set("price", num(e.target.value))} className="inp" placeholder="0,00" /></Field>
        </div>
        <div className="mb-3 rounded-2xl bg-secondary p-4">
          <p className="text-sm text-muted-foreground">Custo unitário real (nota + frete/embalagem ÷ unidades)</p>
          <p className="font-display text-2xl">{brl(real)}</p>
        </div>

        <div className={`mb-4 rounded-2xl p-4 ${m.value >= 0 ? "bg-ok/10" : "bg-destructive/10"}`}>
          <p className="text-sm text-muted-foreground">Margem de lucro bruta</p>
          <p className={`font-display text-2xl ${m.value >= 0 ? "text-ok" : "text-destructive"}`}>
            {brl(m.value)} <span className="text-lg">({m.pct.toFixed(1)}%)</span>
          </p>
        </div>

        <div className="flex gap-2">
          {d.id && (
            <button type="button" onClick={() => { if (confirm("Excluir este produto?")) { deleteProduct(d.id!).then(onClose, () => alert("Não foi possível excluir.")); } }} className="rounded-2xl border border-destructive/40 px-4 text-destructive" aria-label="Excluir">
              <Trash2 />
            </button>
          )}
          <button disabled={saving} className="flex-1 rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
