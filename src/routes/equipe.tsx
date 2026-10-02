import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Pencil, Plus, Trash2, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useStore, type Role } from "@/lib/store";
import { addMember, removeMember, resendAccess, updateMember } from "@/lib/team.functions";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Cravo & Canela Home" },
      { name: "description", content: "Gerencie quem tem acesso ao sistema da loja e o perfil de cada pessoa." },
      { property: "og:title", content: "Equipe — Cravo & Canela Home" },
      { property: "og:description", content: "Administradores e vendedores da loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Equipe,
});

type Member = { id: string; email: string; name: string | null; role: Role };
type Draft = { id?: string; email: string; name: string; role: Role };
const roleLabel: Record<Role, string> = { admin: "Administrador", vendedor: "Vendedor" };

function Equipe() {
  return (
    <Shell ownerOnly>
      <Team />
    </Shell>
  );
}

function Team() {
  const { role } = useStore();
  const [list, setList] = useState<Member[]>([]);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("team_members" as any).select("id,email,name,role").order("role").order("email");
    if (data) setList(data as unknown as Member[]);
  }
  useEffect(() => { if (role === "admin") load(); }, [role]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try { await fn(); setMsg(ok); await load(); return true; }
    catch (e) { alert(e instanceof Error ? e.message : "Não foi possível."); return false; }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl">Equipe</h1>
        <button onClick={() => setEdit({ email: "", name: "", role: "vendedor" })} className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground shadow-warm">
          <Plus className="h-5 w-5" /> Adicionar pessoa
        </button>
      </div>
      <p className="mb-4 text-muted-foreground">Só quem está nesta lista consegue entrar. Ao adicionar alguém, a pessoa recebe um e-mail para criar a senha.</p>
      {msg && <p className="mb-4 rounded-2xl bg-ok/15 p-3 font-semibold text-ok">{msg}</p>}
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {list.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{m.name || m.email}</p>
              <p className="truncate text-sm text-muted-foreground">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${m.role === "admin" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{roleLabel[m.role]}</span>
              <button aria-label="Reenviar acesso" title="Reenviar e-mail de acesso" onClick={() => run(() => resendAccess({ data: { email: m.email } }), `Link de acesso enviado para ${m.email}.`)} className="rounded-full p-2 hover:bg-secondary"><Mail className="h-5 w-5" /></button>
              <button aria-label="Editar" onClick={() => setEdit({ id: m.id, email: m.email, name: m.name ?? "", role: m.role })} className="rounded-full p-2 hover:bg-secondary"><Pencil className="h-5 w-5" /></button>
              <button aria-label="Remover" onClick={() => { if (confirm(`Remover ${m.email} da equipe? A pessoa perde o acesso.`)) run(() => removeMember({ data: { id: m.id } }), "Pessoa removida."); }} className="rounded-full p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-5 w-5" /></button>
            </div>
          </li>
        ))}
      </ul>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 md:items-center" onClick={() => setEdit(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const d = { email: edit.email, name: edit.name, role: edit.role };
              const ok = edit.id
                ? await run(() => updateMember({ data: { id: edit.id!, ...d } }), "Alterações salvas.")
                : await run(() => addMember({ data: d }), `Convite enviado para ${edit.email}.`);
              if (ok) setEdit(null);
            }}
            className="w-full max-w-md rounded-t-3xl bg-card p-5 md:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">{edit.id ? "Editar pessoa" : "Adicionar pessoa"}</h2>
              <button type="button" onClick={() => setEdit(null)} aria-label="Fechar" className="rounded-full p-2 hover:bg-secondary"><X /></button>
            </div>
            <label className="mb-3 block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">Nome</span>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="inp" maxLength={80} /></label>
            <label className="mb-3 block"><span className="mb-1 block text-sm font-semibold text-muted-foreground">E-mail</span>
              <input type="email" required value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className="inp" /></label>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Perfil</p>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {(["vendedor", "admin"] as Role[]).map((r) => (
                <button type="button" key={r} onClick={() => setEdit({ ...edit, role: r })} className={`rounded-2xl border-2 p-3 text-left text-sm ${edit.role === r ? "border-primary bg-primary/10" : "border-border"}`}>
                  <p className="font-bold">{roleLabel[r]}</p>
                  <p className="text-xs text-muted-foreground">{r === "admin" ? "Acesso total, custos e financeiro" : "Vender e ver estoque e preços"}</p>
                </button>
              ))}
            </div>
            <button className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground">{edit.id ? "Salvar" : "Adicionar e enviar convite"}</button>
          </form>
        </div>
      )}
    </>
  );
}
