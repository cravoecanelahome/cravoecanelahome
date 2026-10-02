import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resetStore } from "@/lib/store";
import { requestAccess } from "@/lib/team.functions";

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") resetStore();
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

const IDLE_MS = 2 * 60 * 60 * 1000;
const IDLE_KEY = "cc-last-activity";

/** Logout automático após 2h sem atividade (compartilhado entre abas). */
function useIdleLogout(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const last = Number(localStorage.getItem(IDLE_KEY) || 0);
    if (last && Date.now() - last > IDLE_MS) { supabase.auth.signOut(); return; }
    let lastWrite = 0;
    const touch = () => { const now = Date.now(); if (now - lastWrite > 30000) { lastWrite = now; localStorage.setItem(IDLE_KEY, String(now)); } };
    touch();
    const evs = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const check = () => {
      const t = Number(localStorage.getItem(IDLE_KEY) || Date.now());
      if (Date.now() - t > IDLE_MS) { localStorage.removeItem(IDLE_KEY); supabase.auth.signOut(); }
    };
    const iv = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    return () => { evs.forEach((e) => window.removeEventListener(e, touch)); clearInterval(iv); document.removeEventListener("visibilitychange", check); };
  }, [active]);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  useIdleLogout(!!session);
  if (session === undefined) return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Carregando…</div>;
  if (!session) return <Login />;
  return <>{children}</>;
}

function Login() {
  const [mode, setMode] = useState<"in" | "link">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) setMsg("E-mail ou senha incorretos.");
        else localStorage.setItem(IDLE_KEY, String(Date.now()));
      } else {
        await requestAccess({ data: { email } });
        setMsg("Se este e-mail estiver autorizado pela equipe, enviamos um link para você criar sua senha.");
      }
    } catch {
      setMsg("Não foi possível agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-warm">
        <p className="text-center font-display text-3xl text-primary">Cravo & Canela</p>
        <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">Home</p>
        <h1 className="mb-4 font-display text-2xl">{mode === "in" ? "Entrar" : "Primeiro acesso ou nova senha"}</h1>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-semibold text-muted-foreground">E-mail</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="inp" autoComplete="email" />
        </label>
        {mode === "in" && (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-semibold text-muted-foreground">Senha</span>
            <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} className="inp" autoComplete="current-password" />
          </label>
        )}
        {msg && <p className="mb-3 rounded-xl bg-secondary p-3 text-sm">{msg}</p>}
        <button disabled={busy} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-60">
          {mode === "in" ? "Entrar" : "Enviar link"}
        </button>
        <div className="mt-4 text-center text-sm">
          {mode === "in"
            ? <button type="button" onClick={() => { setMode("link"); setMsg(null); }} className="font-semibold text-primary">Primeiro acesso / esqueci a senha</button>
            : <button type="button" onClick={() => { setMode("in"); setMsg(null); }} className="font-semibold text-primary">Voltar para entrar</button>}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Acesso somente para a equipe autorizada.</p>
      </form>
    </div>
  );
}
