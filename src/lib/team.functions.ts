import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const roleSchema = z.enum(["admin", "vendedor"]);

function redirectUrl() {
  const origin = getRequest()?.headers.get("origin") ?? "";
  return /^https?:\/\//.test(origin) ? `${origin}/reset-password` : undefined;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function findUserId(email: string) {
  const a = await admin();
  const { data } = await a.auth.admin.listUsers({ perPage: 1000 });
  return data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

/** Envia convite (1º acesso) ou link de nova senha — só para e-mails autorizados pela equipe. */
async function sendAccessLink(email: string) {
  const a = await admin();
  const redirectTo = redirectUrl();
  const { error } = await a.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) await a.auth.resetPasswordForEmail(email, { redirectTo });
}

export const requestAccess = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: row } = await a.from("team_members").select("id").ilike("email", data.email).maybeSingle();
    if (row) await sendAccessLink(data.email);
    return { ok: true };
  });

async function assertAdmin(ctx: { supabase: any }) {
  const { data } = await ctx.supabase.rpc("is_admin");
  if (!data) throw new Error("Apenas administradores.");
}

export const addMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: emailSchema, name: z.string().trim().max(80).optional(), role: roleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("team_members").insert({ email: data.email, name: data.name || null, role: data.role });
    if (error) throw new Error(error.code === "23505" ? "Esse e-mail já está na equipe." : "Não foi possível adicionar.");
    await sendAccessLink(data.email);
    return { ok: true };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), email: emailSchema, name: z.string().trim().max(80).optional(), role: roleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: old } = await context.supabase.from("team_members").select("*").eq("id", data.id).maybeSingle();
    if (!old) throw new Error("Pessoa não encontrada.");
    const me = String(context.claims.email ?? "").toLowerCase();
    if (old.email.toLowerCase() === me && data.role !== "admin") throw new Error("Você não pode tirar seu próprio acesso de administrador.");
    const emailChanged = old.email.toLowerCase() !== data.email;
    if (emailChanged) {
      const uid = await findUserId(old.email);
      if (uid) {
        const a = await admin();
        const { error } = await a.auth.admin.updateUserById(uid, { email: data.email, email_confirm: true });
        if (error) throw new Error("Não foi possível trocar o e-mail (talvez já esteja em uso).");
      }
    }
    const { error } = await context.supabase.from("team_members").update({ email: data.email, name: data.name || null, role: data.role }).eq("id", data.id);
    if (error) throw new Error(error.code === "23505" ? "Esse e-mail já está na equipe." : "Não foi possível salvar.");
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: old } = await context.supabase.from("team_members").select("*").eq("id", data.id).maybeSingle();
    if (!old) return { ok: true };
    if (old.email.toLowerCase() === String(context.claims.email ?? "").toLowerCase()) throw new Error("Você não pode remover a si mesmo.");
    const { error } = await context.supabase.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível remover.");
    const uid = await findUserId(old.email);
    if (uid) await (await admin()).auth.admin.deleteUser(uid);
    return { ok: true };
  });

export const resendAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await sendAccessLink(data.email);
    return { ok: true };
  });
