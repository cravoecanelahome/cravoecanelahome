import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

// Endpoint para o n8n fazer os agentes conversarem entre si. Só leitura/conselho — não altera estoque.
const bodySchema = z.object({ agent: z.enum(["gerente", "estoque"]), message: z.string().trim().min(1).max(2000) });

export const Route = createFileRoute("/api/public/agents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["AGENTS_N8N_SECRET"] ?? "";
        const got = request.headers.get("x-agent-secret") ?? "";
        const a = Buffer.from(got), b = Buffer.from(secret);
        if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runAgent } = await import("@/lib/agents.server");
        try {
          const out = await runAgent(supabaseAdmin, parsed.data.agent, [], parsed.data.message);
          return Response.json({ reply: out.reply, proposals: out.proposals });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "erro" }, { status: 502 });
        }
      },
    },
  },
});
