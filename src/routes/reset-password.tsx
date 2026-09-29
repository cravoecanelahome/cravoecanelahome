import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Cravo & Canela Home" },
      { name: "description", content: "Crie uma nova senha para acessar o sistema da loja." },
      { property: "og:title", content: "Nova senha — Cravo & Canela Home" },
      { property: "og:description", content: "Redefinição de senha do sistema da loja." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.auth.updateUser({ password: pw });
          if (error) setMsg(error.message);
          else nav({ to: "/", replace: true });
        }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6"
      >
        <h1 className="mb-4 font-display text-2xl">Criar nova senha</h1>
        <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} className="inp mb-4" placeholder="Nova senha" />
        {msg && <p className="mb-3 text-sm text-destructive">{msg}</p>}
        <button className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground">Salvar senha</button>
      </form>
    </div>
  );
}
