import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-master-token",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireMasterToken(admin: any, req: Request) {
  const token = req.headers.get("x-master-token") || "";
  if (!token) return { ok: false, status: 401, error: "Sessão master ausente." };

  const { data, error } = await admin
    .from("master_session_tokens")
    .select("id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("master token lookup error", error);
    return { ok: false, status: 500, error: "Falha ao validar sessão master." };
  }

  if (!data) return { ok: false, status: 401, error: "Sessão master inválida." };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 401, error: "Sessão master expirada." };
  }

  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não suportado" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const auth = await requireMasterToken(admin, req);
    if (!auth.ok) return json({ success: false, error: (auth as any).error }, (auth as any).status);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (!action) return json({ success: false, error: "Ação obrigatória." }, 400);

    // ===== Actions =====
    if (action === "logout") {
      const token = req.headers.get("x-master-token") || "";
      const { error } = await admin
        .from("master_session_tokens")
        .delete()
        .eq("token", token);
      if (error) {
        console.error("master logout error", error);
        return json({ success: false, error: "Falha ao encerrar sessão." }, 500);
      }
      return json({ success: true, data: {} });
    }

    if (action === "set_role") {
      const userId = String(body?.userId ?? "");
      const role = String(body?.role ?? "user");
      if (!userId) return json({ success: false, error: "userId obrigatório." }, 400);

      const { data: existing } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await admin.from("user_roles").update({ role }).eq("user_id", userId);
        if (error) return json({ success: false, error: error.message }, 400);
      } else {
        const { error } = await admin.from("user_roles").insert({ user_id: userId, role });
        if (error) return json({ success: false, error: error.message }, 400);
      }

      return json({ success: true, data: {} });
    }

    if (action === "update_unit") {
      const unitId = String(body?.unitId ?? "");
      const patch = body?.patch ?? null;
      if (!unitId || !patch || typeof patch !== "object") {
        return json({ success: false, error: "unitId e patch são obrigatórios." }, 400);
      }

      const { error } = await admin.from("units").update(patch).eq("id", unitId);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: {} });
    }

    if (action === "create_unit") {
      const data = body?.data ?? null;
      if (!data || typeof data !== "object") return json({ success: false, error: "data obrigatório." }, 400);
      const { data: inserted, error } = await admin.from("units").insert(data).select("id").maybeSingle();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: { unitId: inserted?.id } });
    }

    if (action === "create_agent") {
      const name = String(body?.name ?? "").trim();
      const cpf = String(body?.cpf ?? "").replace(/\D/g, "");
      const password = String(body?.password ?? "");
      const unit_id = String(body?.unit_id ?? "");
      const team = String(body?.team ?? "");
      const matricula = body?.matricula ? String(body.matricula) : null;
      const phone = body?.phone ? String(body.phone) : null;

      if (!name || !cpf || !password || !unit_id || !team) {
        return json({ success: false, error: "Campos obrigatórios ausentes." }, 400);
      }

      const email = `${cpf}@agent.plantaopro.com`;

      // Create auth user (admin API)
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name.toUpperCase() },
      });
      if (createErr) return json({ success: false, error: createErr.message }, 400);

      const userId = created.user?.id;
      if (!userId) return json({ success: false, error: "Falha ao criar usuário." }, 500);

      // Create agent record (id must match auth user id)
      const licenseExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { error: agentErr } = await admin.from("agents").insert({
        id: userId,
        name: name.toUpperCase(),
        cpf,
        matricula,
        phone,
        team,
        unit_id,
        is_active: true,
        license_status: "active",
        license_expires_at: licenseExpiry,
      });

      if (agentErr) {
        // rollback auth user if agent insert fails
        await admin.auth.admin.deleteUser(userId);
        return json({ success: false, error: agentErr.message }, 400);
      }

      // Default role (best-effort)
      try {
        await admin.from("user_roles").insert({ user_id: userId, role: "user" });
      } catch {
        // ignore
      }

      return json({ success: true, data: { agentId: userId } });
    }

    if (action === "delete_agent") {
      const agentId = String(body?.agentId ?? "");
      if (!agentId) return json({ success: false, error: "agentId obrigatório." }, 400);

      // Delete public data via agent delete trigger chain
      // (client-side helper also exists, but here we do privileged delete)
      const { error: agentDelErr } = await admin.from("agents").delete().eq("id", agentId);
      if (agentDelErr) return json({ success: false, error: agentDelErr.message }, 400);

      // Ensure auth user is deleted as well
      await admin.auth.admin.deleteUser(agentId).catch(() => {});

      return json({ success: true, data: {} });
    }

    // ===== Announcements (admin_announcements) =====
    if (action === "announcement_list") {
      const { data, error } = await admin
        .from("admin_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data });
    }

    if (action === "announcement_upsert") {
      const payload = body?.payload ?? {};
      if (!payload?.title || typeof payload.title !== "string") {
        return json({ success: false, error: "Título obrigatório." }, 400);
      }
      const id = body?.id ? String(body.id) : null;
      if (id) {
        const { data, error } = await admin
          .from("admin_announcements")
          .update(payload)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) return json({ success: false, error: error.message }, 400);
        return json({ success: true, data });
      }
      const { data, error } = await admin
        .from("admin_announcements")
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data });
    }

    if (action === "announcement_toggle") {
      const id = String(body?.id ?? "");
      const isActive = !!body?.is_active;
      if (!id) return json({ success: false, error: "id obrigatório." }, 400);
      const { error } = await admin
        .from("admin_announcements")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: {} });
    }

    if (action === "announcement_delete") {
      const id = String(body?.id ?? "");
      if (!id) return json({ success: false, error: "id obrigatório." }, 400);
      const { error } = await admin.from("admin_announcements").delete().eq("id", id);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: {} });
    }

    if (action === "units_list") {
      const { data, error } = await admin
        .from("units")
        .select("id, name")
        .order("name");
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data });
    }

    if (action === "agents_list_all") {
      const { data, error } = await admin
        .from("agents")
        .select("id, name, team, matricula, unit_id, is_active, is_frozen, approval_status, unit:units(name)")
        .order("name");
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data });
    }

    if (action === "access_logs_list") {
      const limit = Math.min(Number(body?.limit ?? 5000), 20000);
      const { data, error } = await admin
        .from("access_logs")
        .select("id, agent_id, action, created_at, ip_address, user_agent, agent:agents(name, team, matricula)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data });
    }

    return json({ success: false, error: "Ação desconhecida." }, 400);
  } catch (err) {
    console.error("master-admin error", err);
    return json({ success: false, error: "Erro interno." }, 500);
  }
});
