import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Package, ShoppingBag, Users, Contact, Bot } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { useStore, type Role, type Status } from "@/lib/store";

const allNav = [
  { to: "/", label: "Painel", icon: LayoutDashboard, admin: true },
  { to: "/estoque", label: "Estoque", icon: Package, admin: false },
  { to: "/vender", label: "Vender", icon: ShoppingBag, admin: false },
  { to: "/clientes", label: "Clientes", icon: Contact, admin: false },
  { to: "/agentes", label: "Agentes", icon: Bot, admin: true },
  { to: "/equipe", label: "Equipe", icon: Users, admin: true, owner: true },
] as const;

export const OWNER_EMAIL = "juniorrefundini10@gmail.com";

function useEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email?.toLowerCase() ?? null)); }, []);
  return email;
}

export function Shell({ children, adminOnly, ownerOnly }: { children: ReactNode; adminOnly?: boolean | undefined; ownerOnly?: boolean | undefined }) {
  return (
    <AuthGate>
      <Inner adminOnly={adminOnly || ownerOnly} ownerOnly={ownerOnly}>{children}</Inner>
    </AuthGate>
  );
}

function Inner({ children, adminOnly, ownerOnly }: { children: ReactNode; adminOnly?: boolean | undefined; ownerOnly?: boolean | undefined }) {
  const { ready, role } = useStore();
  const email = useEmail();
  const isOwner = role === "admin" && email === OWNER_EMAIL;
  const nav = allNav.filter((n) => (role === "admin" || !n.admin) && (!("owner" in n) || isOwner));
  if (!ready) return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Carregando…</div>;
  if (!role) return <NoAccess />;
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to={role === "admin" ? "/" : "/vender"} className="min-w-0">
            <p className="truncate font-display text-2xl text-primary">Cravo & Canela</p>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Home · {role === "admin" ? "Administrador" : "Vendedor"}</p>
          </Link>
          <nav className="hidden gap-2 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold text-foreground/80 hover:bg-secondary"
                activeProps={{ className: "!bg-primary !text-primary-foreground" }}
              >
                <n.icon className="h-5 w-5" /> {n.label}
              </Link>
            ))}
          </nav>
          <button onClick={() => supabase.auth.signOut()} aria-label="Sair" className="flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {(adminOnly && role !== "admin") || (ownerOnly && email !== null && !isOwner) ? <Restricted role={role} /> : ownerOnly && email === null ? null : children}
      </main>
      <nav className={`fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-card md:hidden ${({ 3: "grid-cols-3", 5: "grid-cols-5", 6: "grid-cols-6" } as Record<number, string>)[nav.length] ?? "grid-cols-4"}`}>
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "!text-primary" }}
          >
            <n.icon className="h-6 w-6" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Restricted({ role }: { role: Role }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 text-center">
      <p className="mb-4 font-display text-2xl">Área exclusiva de administradores</p>
      {role === "vendedor" && <Link to="/vender" className="inline-block rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground">Ir para Vender</Link>}
    </div>
  );
}

function NoAccess() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-sm rounded-3xl border border-border bg-card p-6 text-center">
        <p className="mb-2 font-display text-2xl">Sem acesso</p>
        <p className="mb-4 text-muted-foreground">Este e-mail não faz parte da equipe. Peça a um administrador para liberar seu acesso.</p>
        <button onClick={() => supabase.auth.signOut()} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground">Sair</button>
      </div>
    </div>
  );
}

const statusMap: Record<Status, { label: string; cls: string }> = {
  ok: { label: "Em estoque", cls: "bg-ok/15 text-ok border-ok/30" },
  low: { label: "Acabando", cls: "bg-warn/20 text-warn-foreground border-warn/40" },
  out: { label: "Esgotado", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};
export function StatusBadge({ status }: { status: Status }) {
  const s = statusMap[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
