import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, Trash2, Check, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useStore, brl } from "@/lib/store";
import { applyMovements, askAgent, clearAgentChat } from "@/lib/agents.functions";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes — Cravo & Canela Home" },
      { name: "description", content: "Área privada dos administradores com os agentes Gerente e Controle de Estoque." },
      { property: "og:title", content: "Agentes — Cravo & Canela Home" },
      { property: "og:description", content: "Gerente e controle de estoque por voz, só para administradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Shell adminOnly>
      <Agents />
    </Shell>
  ),
});

type AgentId = "gerente" | "estoque";
type Msg = { author: "user" | "assistant"; content: string };
type Proposal = { productId: string; productName: string; kind: "entrada" | "saida"; qty: number; unitCost: number; freight: number };

const AGENTS: { id: AgentId; name: string; hint: string }[] = [
  { id: "estoque", name: "Controle de Estoque", hint: "Ex.: “Chegaram 10 velas de lavanda a 18 reais cada, frete 25” ou “Saíram 2 vasos quebrados”." },
  { id: "gerente", name: "Gerente", hint: "Ex.: “Como estão as vendas do mês?” ou “O que preciso repor?”" },
];

function Agents() {
  const [agent, setAgent] = useState<AgentId>("estoque");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [props, setProps] = useState<Proposal[]>([]);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const endRef = useRef<HTMLDivElement>(null);
  const { products } = useStore();

  useEffect(() => {
    setProps([]);
    supabase.from("agent_messages" as any).select("author,content").eq("agent", agent).order("created_at").limit(100)
      .then(({ data }) => setMsgs((data as unknown as Msg[]) ?? []));
  }, [agent]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, props]);

  async function send(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setText(""); setBusy(true); setProps([]);
    setMsgs((x) => [...x, { author: "user", content: m }]);
    try {
      const out = await askAgent({ data: { agent, message: m } });
      setMsgs((x) => [...x, { author: "assistant", content: out.reply }]);
      setProps(out.proposals);
    } catch (e) {
      setMsgs((x) => [...x, { author: "assistant", content: e instanceof Error ? e.message : "Erro." }]);
    } finally { setBusy(false); }
  }

  function toggleMic() {
    const W = window as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) { alert("Este navegador não suporta ditado por voz. Use o Chrome ou o microfone do teclado do celular."); return; }
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = true;
    let finalText = text ? text + " " : "";
    rec.onresult = (ev: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript + " "; else interim += r[0].transcript;
      }
      setText((finalText + interim).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  }

  async function confirm() {
    setBusy(true);
    try {
      const r = await applyMovements({ data: { items: props } });
      setMsgs((x) => [...x, { author: "assistant", content: `Registrado: ${r.done.join(", ")}.` }]);
      setProps([]);
    } catch (e) { alert(e instanceof Error ? e.message : "Não foi possível."); }
    finally { setBusy(false); }
  }

  const cur = AGENTS.find((a) => a.id === agent)!;
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl">Agentes</h1>
        <button onClick={async () => { if (confirmClear()) { await clearAgentChat({ data: { agent } }); setMsgs([]); setProps([]); } }} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"><Trash2 className="h-4 w-4" /> Limpar conversa</button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Área privada dos administradores. Vendedores não veem esta aba nem os valores de compra.</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {AGENTS.map((a) => (
          <button key={a.id} onClick={() => setAgent(a.id)} className={`rounded-2xl border-2 p-3 text-left font-bold ${agent === a.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}>{a.name}</button>
        ))}
      </div>
      <div className="mb-4 min-h-[40vh] space-y-3 rounded-3xl border border-border bg-card p-4">
        {msgs.length === 0 && <p className="text-muted-foreground">{cur.hint}</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${m.author === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.content}</div>
        ))}
        {busy && <p className="text-sm text-muted-foreground">Pensando…</p>}
        {props.length > 0 && (
          <div className="rounded-2xl border-2 border-primary p-4">
            <p className="mb-2 font-bold">Confirmar movimentos?</p>
            <ul className="mb-3 space-y-1 text-sm">
              {props.map((p, i) => {
                const stock = products.find((x) => x.id === p.productId)?.stock;
                return (
                  <li key={i}>
                    <b className={p.kind === "entrada" ? "text-ok" : "text-destructive"}>{p.kind === "entrada" ? "Entrada" : "Saída"} {p.qty}</b> · {p.productName}
                    {p.kind === "entrada" && p.unitCost > 0 && <> · custo {brl(p.unitCost)}{p.freight > 0 && <> + frete {brl(p.freight)}</>}</>}
                    {stock !== undefined && <span className="text-muted-foreground"> (estoque atual {stock})</span>}
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <button disabled={busy} onClick={confirm} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground"><Check className="h-5 w-5" /> Confirmar</button>
              <button onClick={() => setProps([])} className="flex items-center gap-2 rounded-2xl border border-border px-4 py-3 font-semibold"><X className="h-5 w-5" /> Cancelar</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); recRef.current?.stop(); send(text); }} className="flex items-end gap-2">
        <button type="button" onClick={toggleMic} aria-label={listening ? "Parar gravação" : "Falar"} className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${listening ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-secondary"}`}>
          {listening ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={listening ? "Ouvindo…" : "Fale pelo microfone ou digite"} className="inp min-h-14 flex-1 resize-none" maxLength={2000} />
        <button disabled={busy || !text.trim()} aria-label="Enviar" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-6 w-6" /></button>
      </form>
    </>
  );
}

function confirmClear() { return window.confirm("Apagar o histórico desta conversa?"); }
