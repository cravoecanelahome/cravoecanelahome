import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Shell, StatusBadge } from "@/components/Shell";
import { brl, stockStatus, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel do mês — Cravo & Canela Home" },
      { name: "description", content: "Resumo financeiro mensal: faturamento, custos, lucro e mais vendidos." },
      { property: "og:title", content: "Painel do mês — Cravo & Canela Home" },
      { property: "og:description", content: "Resumo financeiro mensal da loja Cravo & Canela Home." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { sales, products } = useStore();
  const [offset, setOffset] = useState(0);
  const ref = new Date();
  ref.setDate(1);
  ref.setMonth(ref.getMonth() + offset);
  const monthLabel = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const data = useMemo(() => {
    const m = sales.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    });
    const revenue = m.reduce((a, s) => a + s.qty * s.unitPrice, 0);
    const cogs = m.reduce((a, s) => a + s.qty * s.unitCost, 0);
    const byProd = new Map<string, { name: string; qty: number; total: number }>();
    const byPay: Record<string, number> = { Pix: 0, Cartão: 0, Dinheiro: 0 };
    m.forEach((s) => {
      const e = byProd.get(s.productId) ?? { name: s.productName, qty: 0, total: 0 };
      e.qty += s.qty;
      e.total += s.qty * s.unitPrice;
      byProd.set(s.productId, e);
      byPay[s.payment] = (byPay[s.payment] ?? 0) + s.qty * s.unitPrice;
    });
    const top = [...byProd.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    return { m, revenue, cogs, profit: revenue - cogs, top, byPay };
  }, [sales, offset]);

  const alerts = products.filter((p) => stockStatus(p) !== "ok");
  const maxQty = data.top[0]?.qty ?? 1;

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground">Olá, Valdirene</p>
          <h1 className="font-display text-3xl capitalize md:text-4xl">{monthLabel}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button aria-label="Mês anterior" onClick={() => setOffset(offset - 1)} className="rounded-full border border-border bg-card p-3">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button aria-label="Próximo mês" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} className="rounded-full border border-border bg-card p-3 disabled:opacity-40">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card label="Faturamento" value={brl(data.revenue)} tone="bg-primary text-primary-foreground" />
        <Card label="Custo das mercadorias" value={brl(data.cogs)} />
        <Card label="Lucro" value={brl(data.profit)} tone="bg-ok text-primary-foreground" />
        <Card label="Vendas no mês" value={String(data.m.length)} />
      </div>

      <Link to="/vender" className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-accent py-5 text-xl font-bold text-accent-foreground shadow-warm md:hidden">
        <ShoppingBag className="h-6 w-6" /> Registrar venda
      </Link>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-2xl">Mais vendidos</h2>
          {data.top.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma venda neste mês ainda.</p>
          ) : (
            <ul className="space-y-3">
              {data.top.map((t, i) => (
                <li key={i}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-semibold">{i + 1}. {t.name}</span>
                    <span className="shrink-0 text-muted-foreground">{t.qty} un · {brl(t.total)}</span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(t.qty / maxQty) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
            {Object.entries(data.byPay).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-secondary p-3">
                <p className="text-muted-foreground">{k}</p>
                <p className="font-bold">{brl(v)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-2xl">Atenção ao estoque</h2>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">Tudo em ordem por aqui. 🌿</p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="truncate">{p.name} <span className="text-muted-foreground">({p.stock})</span></span>
                  <StatusBadge status={stockStatus(p)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}

function Card({ label, value, tone = "bg-card" }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`rounded-2xl border border-border p-4 md:p-5 ${tone}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-1 truncate font-display text-xl md:text-3xl">{value}</p>
    </div>
  );
}
