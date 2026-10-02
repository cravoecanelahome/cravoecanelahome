/* eslint-disable @typescript-eslint/no-explicit-any */
export type AgentId = "gerente" | "estoque";
export type Proposal = { productId: string; productName: string; kind: "entrada" | "saida"; qty: number; unitCost: number; freight: number };

const PROMPTS: Record<AgentId, string> = {
  estoque:
    "Você é o agente de Controle de Estoque da loja Cravo & Canela Home. Interprete falas (transcritas de áudio) sobre entradas (compras/reposição) e saídas (perdas, quebras, brindes, retiradas) de produtos. Sempre que o pedido envolver movimentar estoque, chame a ferramenta propor_movimentos com os produtos do catálogo (use o id exato). Em entradas, registre custo unitário da nota e frete/embalagem total se mencionados (0 se não). Se não identificar o produto, pergunte. Responda curto, em português.",
  gerente:
    "Você é o agente Gerente da loja Cravo & Canela Home. Responde à dona e ao sócio sobre vendas, lucro, estoque baixo, margens e prioridades de compra, usando os dados fornecidos. Seja objetivo, em português, com valores em R$. Pode sugerir que o agente de estoque registre movimentos, mas não invente números.",
};

export async function buildContext(sb: any, agent: AgentId) {
  const { data: products } = await sb.from("products").select("id,name,category,stock,min_stock,cost,real_cost,price").order("name");
  let ctx = `Catálogo (id | nome | estoque | mínimo | custo real | preço):\n${(products ?? []).map((p: any) => `${p.id} | ${p.name} | ${p.stock} | ${p.min_stock} | ${p.real_cost} | ${p.price}`).join("\n")}`;
  if (agent === "gerente") {
    const since = new Date(); since.setDate(1); since.setHours(0, 0, 0, 0);
    const { data: sales } = await sb.from("sales").select("product_name,qty,unit_price,unit_cost,fee_value,shipping_cost,shipping_paid_by,channel,payment,created_at").gte("created_at", since.toISOString());
    let rev = 0, cmv = 0, fees = 0, ship = 0;
    const byProd: Record<string, number> = {};
    for (const s of sales ?? []) {
      rev += s.qty * s.unit_price; cmv += s.qty * s.unit_cost; fees += Number(s.fee_value);
      if (s.shipping_paid_by === "loja") ship += Number(s.shipping_cost);
      byProd[s.product_name] = (byProd[s.product_name] ?? 0) + s.qty;
    }
    const top = Object.entries(byProd).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, q]) => `${n}: ${q}`).join(", ");
    ctx += `\n\nMês atual: ${sales?.length ?? 0} vendas; faturamento R$ ${rev.toFixed(2)}; custo mercadorias R$ ${cmv.toFixed(2)}; taxas R$ ${fees.toFixed(2)}; frete absorvido R$ ${ship.toFixed(2)}; lucro líquido R$ ${(rev - cmv - fees - ship).toFixed(2)}. Mais vendidos: ${top || "—"}.`;
  }
  return { ctx, products: (products ?? []) as any[] };
}

export async function runAgent(sb: any, agent: AgentId, history: { author: string; content: string }[], message: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("IA indisponível.");
  const { ctx, products } = await buildContext(sb, agent);
  const tools = agent === "estoque" ? [{
    type: "function",
    function: {
      name: "propor_movimentos",
      description: "Propõe entradas/saídas de estoque para confirmação.",
      parameters: {
        type: "object",
        properties: {
          itens: { type: "array", items: { type: "object", properties: {
            productId: { type: "string" }, kind: { type: "string", enum: ["entrada", "saida"] },
            qty: { type: "integer", minimum: 1 }, unitCost: { type: "number" }, freight: { type: "number" },
          }, required: ["productId", "kind", "qty"] } },
          resposta: { type: "string", description: "Resumo curto para o usuário" },
        },
        required: ["itens", "resposta"],
      },
    },
  }] : undefined;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `${PROMPTS[agent]}\n\n${ctx}` },
        ...history.slice(-12).map((h) => ({ role: h.author === "user" ? "user" : "assistant", content: h.content })),
        { role: "user", content: message },
      ],
      ...(tools ? { tools } : {}),
    }),
  });
  if (res.status === 429) throw new Error("Muitos pedidos agora, tente em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados.");
  if (!res.ok) throw new Error("O agente não respondeu.");
  const json: any = await res.json();
  const msg = json.choices?.[0]?.message ?? {};
  let reply: string = msg.content ?? "";
  let proposals: Proposal[] = [];
  const call = msg.tool_calls?.[0];
  if (call?.function?.arguments) {
    try {
      const args = JSON.parse(call.function.arguments);
      reply = args.resposta || reply || "Confira os movimentos abaixo.";
      proposals = (args.itens ?? []).flatMap((i: any) => {
        const p = products.find((x) => x.id === i.productId);
        if (!p || !(i.qty > 0)) return [];
        return [{ productId: p.id, productName: p.name, kind: i.kind === "saida" ? "saida" : "entrada", qty: Math.round(i.qty), unitCost: Math.max(0, Number(i.unitCost) || 0), freight: Math.max(0, Number(i.freight) || 0) }];
      });
    } catch { /* ignore malformed */ }
  }
  return { reply: reply || "Não entendi, pode repetir?", proposals };
}
