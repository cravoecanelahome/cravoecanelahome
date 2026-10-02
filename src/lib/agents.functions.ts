import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */
const agentSchema = z.enum(["gerente", "estoque"]);

async function assertAdmin(sb: any) {
  const { data } = await sb.rpc("is_admin");
  if (!data) throw new Error("Apenas administradores.");
}

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ agent: agentSchema, message: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const { runAgent } = await import("./agents.server");
    const { data: hist } = await sb.from("agent_messages").select("author,content").eq("agent", data.agent).order("created_at", { ascending: false }).limit(12);
    const out = await runAgent(sb, data.agent, (hist ?? []).reverse(), data.message);
    await sb.from("agent_messages").insert([
      { agent: data.agent, author: "user", content: data.message },
      { agent: data.agent, author: "assistant", content: out.reply },
    ]);
    return out;
  });

const itemSchema = z.object({
  productId: z.string().uuid(), kind: z.enum(["entrada", "saida"]), qty: z.number().int().min(1).max(100000),
  unitCost: z.number().min(0).max(1e7), freight: z.number().min(0).max(1e7),
});

export const applyMovements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ items: z.array(itemSchema).min(1).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    const done: string[] = [];
    for (const it of data.items) {
      const { data: p } = await sb.from("products").select("*").eq("id", it.productId).maybeSingle();
      if (!p) continue;
      let patch: Record<string, number>;
      if (it.kind === "entrada") {
        patch = { stock: p.stock + it.qty };
        if (it.unitCost > 0) Object.assign(patch, { cost: it.unitCost, purchase_extra: it.freight, purchase_qty: it.qty, real_cost: +(it.unitCost + it.freight / it.qty).toFixed(2) });
      } else {
        if (p.stock < it.qty) throw new Error(`Estoque insuficiente de ${p.name} (tem ${p.stock}).`);
        patch = { stock: p.stock - it.qty };
      }
      const { error } = await sb.from("products").update(patch).eq("id", p.id);
      if (error) throw new Error("Não foi possível atualizar o estoque.");
      await sb.from("stock_movements").insert({ product_id: p.id, product_name: p.name, kind: it.kind, qty: it.qty, unit_cost: it.unitCost, freight: it.freight, source: "agente" });
      done.push(`${it.kind === "entrada" ? "+" : "-"}${it.qty} ${p.name}`);
    }
    return { done };
  });

export const clearAgentChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ agent: agentSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertAdmin(sb);
    await sb.from("agent_messages").delete().eq("agent", data.agent);
    return { ok: true };
  });
