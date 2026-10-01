import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, Check, CreditCard, Layers, Minus, Plus, QrCode, Search, Wallet, UserPlus, User, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { CustomerForm, Modal } from "@/components/CustomerForm";
import { onlyDigits, brl, CHANNELS, feeRate, registerSale, stockStatus, useStore, type Channel, type Payment } from "@/lib/store";

export const Route = createFileRoute("/vender")({
  head: () => ({
    meta: [
      { title: "Registrar venda — Cravo & Canela Home" },
      { name: "description", content: "Registre vendas em poucos toques com baixa automática no estoque." },
      { property: "og:title", content: "Registrar venda — Cravo & Canela Home" },
      { property: "og:description", content: "Venda rápida com Pix, cartão ou dinheiro." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vender,
});

const pays: { k: Payment; icon: typeof QrCode }[] = [
  { k: "Pix", icon: QrCode },
  { k: "Dinheiro", icon: Banknote },
  { k: "Débito", icon: Wallet },
  { k: "Crédito", icon: CreditCard },
  { k: "Parcelado", icon: Layers },
];

function Vender() {
  const { products, sales, fees, role, customers } = useStore();
  const [cust, setCust] = useState<string | null>(null);
  const [cq, setCq] = useState("");
  const [newCust, setNewCust] = useState(false);
  const [channel, setChannel] = useState<Channel>("Loja física");
  const [inst, setInst] = useState(2);
  const [ship, setShip] = useState<"none" | "cliente" | "loja">("none");
  const [shipCost, setShipCost] = useState(0);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState<Payment>("Pix");
  const [done, setDone] = useState<string | null>(null);

  const p = products.find((x) => x.id === sel);
  const list = products.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const today = sales.filter((s) => new Date(s.date).toDateString() === new Date().toDateString());

  function confirm() {
    if (!p || busy) return;
    setBusy(true);
    registerSale({ productId: p.id, qty, payment: pay, installments: inst, channel, shippingCost: shipCost, shippingPaidBy: ship === "none" ? null : ship, customerId: cust })
      .then(() => {
        setDone(`${qty}× ${p.name} · ${brl(qty * p.price)} no ${pay}${pay === "Parcelado" ? ` ${inst}x` : ""} · ${channel}`);
        setSel(null);
        setQty(1);
        setShip("none");
        setShipCost(0);
        setCust(null);
        setTimeout(() => setDone(null), 3500);
      })
      .catch(() => alert("Não foi possível registrar a venda (estoque insuficiente ou sem internet)."))
      .finally(() => setBusy(false));
  }

  const chosen = customers.find((c) => c.id === cust);
  const cqd = onlyDigits(cq);
  const matches = cq.trim() ? customers.filter((c) => c.name.toLowerCase().includes(cq.toLowerCase()) || (cqd && onlyDigits(c.whatsapp ?? "").includes(cqd))).slice(0, 5) : [];
  const CustomerPick = () => chosen ? (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-secondary p-3">
      <span className="flex min-w-0 items-center gap-2 font-semibold"><User className="h-5 w-5 shrink-0" /><span className="truncate">{chosen.name}</span></span>
      <button aria-label="Remover cliente" onClick={() => setCust(null)} className="rounded-xl bg-card p-2"><X className="h-4 w-4" /></button>
    </div>
  ) : (
    <div className="mb-4">
      <div className="flex gap-2">
        <input value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Nome ou WhatsApp (ou deixe avulsa)" className="inp" />
        <button aria-label="Cadastrar cliente" onClick={() => setNewCust(true)} className="shrink-0 rounded-2xl border-2 border-border px-3"><UserPlus className="h-5 w-5" /></button>
      </div>
      {matches.length > 0 && (
        <ul className="mt-1 divide-y divide-border rounded-2xl border border-border">
          {matches.map((c) => (
            <li key={c.id}><button onClick={() => { setCust(c.id); setCq(""); }} className="w-full p-3 text-left text-sm"><b>{c.name}</b> <span className="text-muted-foreground">{c.whatsapp}</span></button></li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Shell>
      {newCust && (
        <Modal title="Cadastro rápido" onClose={() => setNewCust(false)}>
          <CustomerForm initial={{ name: onlyDigits(cq) ? "" : cq, whatsapp: onlyDigits(cq) ? cq : "" }} onCancel={() => setNewCust(false)} onDone={(c) => { setCust(c.id); setCq(""); setNewCust(false); }} />
        </Modal>
      )}
      <h1 className="mb-4 font-display text-3xl md:text-4xl">Registrar venda</h1>
      {done && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-ok p-4 font-semibold text-primary-foreground">
          <Check className="h-6 w-6 shrink-0" /> Venda registrada! {done}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[1fr_380px]">
        <section>
          <p className="mb-2 font-semibold text-muted-foreground">1. Escolha o produto</p>
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="inp !pl-12" />
          </div>
          {products.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              Nenhum produto ainda.{role === "admin" && <> <Link to="/estoque" className="font-bold text-primary underline">Cadastrar no estoque</Link></>}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {list.map((x) => {
                const out = stockStatus(x) === "out";
                return (
                  <button key={x.id} disabled={out} onClick={() => { setSel(x.id); setQty(1); }}
                    className={`flex items-center gap-2 rounded-2xl border-2 bg-card p-2 text-left disabled:opacity-40 ${sel === x.id ? "border-primary" : "border-transparent"}`}>
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      {x.photo && <img src={x.photo} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{x.name}</p>
                      <p className="text-sm text-primary">{brl(x.price)}</p>
                      <p className="text-xs text-muted-foreground">{out ? "Esgotado" : `${x.stock} em estoque`}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-3xl border border-border bg-card p-5 md:sticky md:top-4">
          {!p ? (
            <p className="py-6 text-center text-muted-foreground">Toque em um produto para começar.</p>
          ) : (
            <>
              <p className="truncate font-display text-2xl">{p.name}</p>
              <p className="mb-4 text-muted-foreground">{brl(p.price)} cada</p>
              <p className="mb-2 font-semibold text-muted-foreground">2. Quantidade</p>
              <div className="mb-5 flex items-center justify-between rounded-2xl bg-secondary p-2">
                <button aria-label="Menos" onClick={() => setQty(Math.max(1, qty - 1))} className="rounded-xl bg-card p-3"><Minus /></button>
                <span className="font-display text-3xl">{qty}</span>
                <button aria-label="Mais" onClick={() => setQty(Math.min(p.stock, qty + 1))} className="rounded-xl bg-card p-3"><Plus /></button>
              </div>
              <p className="mb-2 font-semibold text-muted-foreground">3. Canal de venda</p>
              <div className="mb-5 grid grid-cols-2 gap-2">
                {CHANNELS.map((c) => (
                  <button key={c} onClick={() => setChannel(c)} className={`rounded-2xl border-2 py-3 text-sm font-bold ${channel === c ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{c}</button>
                ))}
              </div>
              <p className="mb-2 font-semibold text-muted-foreground">4. Pagamento</p>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {pays.map(({ k, icon: I }) => (
                  <button key={k} onClick={() => setPay(k)} className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 text-sm font-bold ${pay === k ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                    <I className="h-6 w-6" /> {k}
                  </button>
                ))}
              </div>
              {pay === "Parcelado" && (
                <label className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-secondary p-3">
                  <span className="font-semibold">Parcelas</span>
                  <select value={inst} onChange={(e) => setInst(Number(e.target.value))} className="rounded-xl border border-input bg-card px-3 py-2">
                    {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </label>
              )}
              <p className="mb-2 font-semibold text-muted-foreground">5. Frete de envio</p>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {([["none", "Sem frete"], ["cliente", "Cliente pagou"], ["loja", "Loja pagou"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setShip(k)} className={`rounded-2xl border-2 py-3 text-xs font-bold ${ship === k ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{l}</button>
                ))}
              </div>
              {ship !== "none" && (
                <label className="mb-3 block">
                  <span className="mb-1 block text-sm font-semibold text-muted-foreground">Valor do frete R$</span>
                  <input inputMode="decimal" defaultValue={shipCost || ""} onChange={(e) => setShipCost(Math.max(0, Number(e.target.value.replace(",", ".")) || 0))} className="inp" placeholder="0,00" />
                </label>
              )}
              <p className="mb-2 font-semibold text-muted-foreground">6. Cliente (opcional)</p>
              {CustomerPick()}
              {role === "admin" && (() => {
                const total = qty * p.price;
                const fee = total * feeRate(pay, inst, fees) / 100;
                const net = total - qty * p.realCost - fee - (ship === "loja" ? shipCost : 0);
                return (
                  <div className="mb-4 space-y-1 rounded-2xl bg-secondary p-3 text-sm">
                    <div className="flex justify-between"><span>Taxa da maquininha ({feeRate(pay, inst, fees).toFixed(2)}%)</span><span>−{brl(fee)}</span></div>
                    {ship === "loja" && <div className="flex justify-between"><span>Frete pago pela loja</span><span>−{brl(shipCost)}</span></div>}
                    <div className="flex justify-between font-bold"><span>Lucro líquido</span><span className={net >= 0 ? "text-ok" : "text-destructive"}>{brl(net)}</span></div>
                  </div>
                );
              })()}
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-3xl text-primary">{brl(qty * p.price)}</span>
              </div>
              <button onClick={confirm} disabled={busy} className="w-full disabled:opacity-60 rounded-2xl bg-accent py-4 text-lg font-bold text-accent-foreground shadow-warm">
                Confirmar venda
              </button>
            </>
          )}
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-2xl">Vendas de hoje</h2>
        {today.length === 0 ? <p className="text-muted-foreground">Nenhuma venda hoje ainda.</p> : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {today.map((s) => (
              <li key={s.id} className="flex justify-between gap-2 p-3 text-sm">
                <span className="truncate">{s.qty}× {s.productName} <span className="text-muted-foreground">· {s.payment}{s.payment === "Parcelado" ? ` ${s.installments}x` : ""} · {s.channel} · {new Date(s.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></span>
                <span className="shrink-0 font-bold">{brl(s.qty * s.unitPrice)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
