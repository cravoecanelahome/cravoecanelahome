import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { Shell, StatusBadge } from "@/components/Shell";
import { brl, CHANNELS, PAYMENTS, saleNet, saveFees, stockStatus, useStore, type Fees } from "@/lib/store";

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
  const { sales, products, fees } = useStore();
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
    const byPay: Record<string, number> = Object.fromEntries(PAYMENTS.map((k) => [k, 0]));
    const byChannel: Record<string, number> = Object.fromEntries(CHANNELS.map((k) => [k, 0]));
    const feesTotal = m.reduce((a, s) => a + s.feeValue, 0);
    const shipTotal = m.reduce((a, s) => a + (s.shippingPaidBy === "loja" ? s.shippingCost : 0), 0);
    const net = m.reduce((a, s) => a + saleNet(s), 0);
    m.forEach((s) => {
      const e = byProd.get(s.productId ?? s.productName) ?? { name: s.productName, qty: 0, total: 0 };
      e.qty += s.qty;
      e.total += s.qty * s.unitPrice;
      byProd.set(s.productId ?? s.productName, e);
      byPay[s.payment] = (byPay[s.payment] ?? 0) + s.qty * s.unitPrice;
      byChannel[s.channel] = (byChannel[s.channel] ?? 0) + s.qty * s.unitPrice;
    });
    const top = [...byProd.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    return { m, revenue, cogs, feesTotal, shipTotal, net, top, byPay, byChannel };
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
        <Card label="Taxas da maquininha" value={brl(data.feesTotal)} />
        <Card label="Lucro líquido real" value={brl(data.net)} tone="bg-ok text-primary-foreground" />
        <Card label="Lucro bruto" value={brl(data.revenue - data.cogs)} />
        <Card label="Frete pago pela loja" value={brl(data.shipTotal)} />
        <Card label="Vendas no mês" value={String(data.m.length)} />
        <Card label="Margem líquida" value={data.revenue > 0 ? `${((data.net / data.revenue) * 100).toFixed(1)}%` : "—"} />
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
          <h3 className="mt-6 mb-2 font-semibold text-muted-foreground">Por forma de pagamento</h3>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {Object.entries(data.byPay).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-secondary p-3">
                <p className="text-muted-foreground">{k}</p>
                <p className="font-bold">{brl(v)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-2xl">Faturamento por canal</h2>
          <ul className="mb-6 space-y-3">
            {Object.entries(data.byChannel).map(([k, v]) => (
              <li key={k}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{k}</span><span>{brl(v)}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{ width: `${data.revenue ? (v / data.revenue) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
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
      <FeeSettings key={JSON.stringify(fees)} fees={fees} />
    </Shell>
  );
}

function FeeSettings({ fees }: { fees: Fees }) {
  const [f, setF] = useState<Fees>(fees);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const fields: [keyof Fees, string][] = [["pix", "Pix %"], ["debit", "Débito %"], ["credit", "Crédito à vista %"], ["installmentBase", "Parcelado 2x %"], ["installmentPer", "+ % por parcela extra"]];
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <button onClick={() => { setF(fees); setOpen(!open); }} className="font-display text-2xl">Taxas da maquininha {open ? "▲" : "▼"}</button>
      {open && (
        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); saveFees(f).then(() => setMsg("Taxas salvas!"), () => setMsg("Erro ao salvar.")); }}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {fields.map(([k, l]) => (
              <label key={k}><span className="mb-1 block text-sm font-semibold text-muted-foreground">{l}</span>
                <input inputMode="decimal" defaultValue={String(f[k]).replace(".", ",")} onChange={(e) => setF({ ...f, [k]: Math.max(0, Number(e.target.value.replace(",", ".")) || 0) })} className="inp" />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Ex.: parcelado em 4x = taxa de 2x + 2 × taxa por parcela extra. Vale para as próximas vendas.</p>
          <button className="mt-3 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground">Salvar taxas</button> {msg && <span className="ml-2 text-sm">{msg}</span>}
        </form>
      )}
    </section>
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
