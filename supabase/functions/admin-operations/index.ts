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

interface AuthResult {
  ok: boolean;
  status?: number;
  error?: string;
  userId?: string;
  isMaster?: boolean;
}

async function authenticateRequest(admin: any, req: Request): Promise<AuthResult> {
  const masterToken = req.headers.get("x-master-token") || "";
  const authHeader = req.headers.get("authorization") || "";

  // Try master token first
  if (masterToken) {
    const { data, error } = await admin
      .from("master_session_tokens")
      .select("id, expires_at")
      .eq("token", masterToken)
      .maybeSingle();

    if (error) {
      console.error("master token lookup error", error);
      return { ok: false, status: 500, error: "Falha ao validar sessão master." };
    }

    if (!data) {
      return { ok: false, status: 401, error: "Sessão master inválida." };
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return { ok: false, status: 401, error: "Sessão master expirada." };
    }

    return { ok: true, isMaster: true };
  }

  // Try JWT token for admin users
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error } = await admin.auth.getUser(token);
    
    if (error || !user) {
      return { ok: false, status: 401, error: "Token de sessão inválido." };
    }

    // Check if user has admin or master role
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "master")) {
      return { ok: false, status: 403, error: "Acesso negado. Privilégios insuficientes." };
    }

    return { ok: true, userId: user.id, isMaster: roleData.role === "master" };
  }

  return { ok: false, status: 401, error: "Autenticação necessária." };
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

    const auth = await authenticateRequest(admin, req);
    if (!auth.ok) {
      return json({ success: false, error: auth.error }, auth.status);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (!action) return json({ success: false, error: "Ação obrigatória." }, 400);

    // ===== ROLE OPERATIONS =====
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

    // ===== AGENT APPROVAL OPERATIONS =====
    if (action === "approve_agent") {
      const agentId = String(body?.agentId ?? "");
      if (!agentId) return json({ success: false, error: "agentId obrigatório." }, 400);

      const { error } = await admin.from("agents").update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        is_active: true
      }).eq("id", agentId);

      if (error) {
        console.error("[approve_agent] Error:", error);
        return json({ success: false, error: error.message }, 400);
      }

      console.log(`[approve_agent] Agent ${agentId} approved successfully`);
      return json({ success: true, data: {} });
    }

    if (action === "reject_agent") {
      const agentId = String(body?.agentId ?? "");
      const reason = String(body?.reason ?? "Cadastro não autorizado");
      if (!agentId) return json({ success: false, error: "agentId obrigatório." }, 400);

      const { error } = await admin.from("agents").update({
        approval_status: "rejected",
        rejection_reason: reason,
        is_active: false
      }).eq("id", agentId);

      if (error) {
        console.error("[reject_agent] Error:", error);
        return json({ success: false, error: error.message }, 400);
      }

      console.log(`[reject_agent] Agent ${agentId} rejected`);
      return json({ success: true, data: {} });
    }

    if (action === "get_pending_agents") {
      const { data, error } = await admin
        .from("agents")
        .select(`
          id,
          name,
          cpf,
          matricula,
          team,
          phone,
          created_at,
          approval_status,
          unit:units(id, name, municipality)
        `)
        .or("approval_status.eq.pending,approval_status.is.null")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[get_pending_agents] Error:", error);
        return json({ success: false, error: error.message }, 400);
      }

      console.log(`[get_pending_agents] Found ${data?.length || 0} pending agents`);
      return json({ success: true, data: { agents: data || [] } });
    }

    // ===== UNIT OPERATIONS =====
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
      if (!data || typeof data !== "object") {
        return json({ success: false, error: "data obrigatório." }, 400);
      }
      const { data: inserted, error } = await admin.from("units").insert(data).select("id").maybeSingle();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: { unitId: inserted?.id } });
    }

    // ===== AGENT OPERATIONS =====
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

      // Check if CPF already exists
      const { data: existingAgent } = await admin
        .from("agents")
        .select("id")
        .eq("cpf", cpf)
        .maybeSingle();

      if (existingAgent) {
        return json({ success: false, error: "CPF já cadastrado." }, 400);
      }

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

      // Create agent record
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
        // Rollback auth user if agent insert fails
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

    if (action === "update_agent") {
      const agentId = String(body?.agentId ?? "");
      const patch = body?.patch ?? null;
      if (!agentId || !patch || typeof patch !== "object") {
        return json({ success: false, error: "agentId e patch são obrigatórios." }, 400);
      }

      const { error } = await admin.from("agents").update(patch).eq("id", agentId);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: {} });
    }

    if (action === "delete_agent") {
      const agentId = String(body?.agentId ?? "");
      if (!agentId) return json({ success: false, error: "agentId obrigatório." }, 400);

      console.log(`[delete_agent] Iniciando exclusão completa para: ${agentId}`);

      // Delete from ALL related tables first (order matters for foreign keys)
      const tables = [
        { name: "ad_views", column: "agent_id" },
        { name: "shift_alerts", column: "agent_id" },
        { name: "overtime_bank", column: "agent_id" },
        { name: "agent_shifts", column: "agent_id" },
        { name: "agent_events", column: "agent_id" },
        { name: "agent_leaves", column: "agent_id" },
        // shift_planner_configs removido — tabela descontinuada
        { name: "shifts", column: "agent_id" },
        { name: "transfer_requests", column: "agent_id" },
        { name: "chat_room_members", column: "agent_id" },
        { name: "deleted_messages", column: "agent_id" },
        { name: "access_logs", column: "agent_id" },
        { name: "payments", column: "agent_id" },
        { name: "notifications", column: "agent_id" },
        { name: "saved_credentials", column: "agent_id" },
        { name: "password_change_requests", column: "agent_id" },
        { name: "offline_license_cache", column: "agent_id" },
        { name: "license_code_usage", column: "agent_id" },
        { name: "chat_messages", column: "sender_id" },
        { name: "master_session_tokens", column: "user_id" },
      ];

      for (const { name, column } of tables) {
        try {
          await admin.from(name).delete().eq(column, agentId);
          console.log(`[delete_agent] ✓ ${name} limpo`);
        } catch (e) {
          console.warn(`[delete_agent] Erro em ${name}:`, e);
        }
      }

      // Delete user_roles and profiles
      try {
        await admin.from("user_roles").delete().eq("user_id", agentId);
        console.log("[delete_agent] ✓ user_roles limpo");
      } catch {
        // ignore
      }
      try {
        await admin.from("profiles").delete().eq("user_id", agentId);
        console.log("[delete_agent] ✓ profiles limpo");
      } catch {
        // ignore
      }

      // Delete agent record
      const { error: agentDelErr } = await admin.from("agents").delete().eq("id", agentId);
      if (agentDelErr) {
        console.error("[delete_agent] Erro ao deletar agent:", agentDelErr);
        return json({ success: false, error: agentDelErr.message }, 400);
      }
      console.log("[delete_agent] ✓ agents limpo");

      // Delete auth user (allows re-registration with same CPF)
      try {
        await admin.auth.admin.deleteUser(agentId);
        console.log("[delete_agent] ✓ auth.users limpo");
      } catch (e) {
        console.warn("[delete_agent] Erro ao deletar auth user:", e);
      }

      console.log(`[delete_agent] Exclusão completa concluída para: ${agentId}`);
      return json({ success: true, data: {} });
    }

    // ===== CLEANUP ORPHAN AUTH USER =====
    if (action === "cleanup_orphan_auth" || action === "purge_user") {
      const cpf = String(body?.cpf ?? "").replace(/\D/g, "");
      if (!cpf || cpf.length !== 11) {
        return json({ success: false, error: "CPF inválido." }, 400);
      }

      const email = `${cpf}@agent.plantaopro.com`;
      console.log(`[purge_user] Iniciando limpeza total para: ${email}`);

      // Coletar IDs de qualquer agente com esse CPF
      const { data: agentRows } = await admin
        .from("agents")
        .select("id")
        .eq("cpf", cpf);
      const agentIds = (agentRows ?? []).map((r: any) => r.id);

      // Coletar usuário auth (se existir)
      const { data: users } = await admin.auth.admin.listUsers();
      const authUser = users?.users?.find((u) => u.email === email);
      const allUserIds = Array.from(new Set([...agentIds, ...(authUser ? [authUser.id] : [])]));

      if (allUserIds.length === 0) {
        return json({ success: true, data: { removed: false } });
      }

      const userIdTables = [
        "user_roles", "profiles", "saved_credentials", "admin_permissions",
        "notifications", "activity_logs", "access_logs", "master_session_tokens",
        "pending_registrations_log",
      ];
      const agentIdTables = [
        "agent_shifts", "agent_leaves", "agent_events", "overtime_bank",
        "bh_monthly_cycles", "shift_alerts", "shift_swaps", "transfer_requests",
        "password_change_requests", "offline_license_cache", "license_code_usage",
        "chat_messages", "chat_room_members", "deleted_messages", "ad_views",
        "screen_views", "payments", "shifts",
      ];

      for (const t of userIdTables) {
        try { await admin.from(t).delete().in("user_id", allUserIds); } catch (e) { console.warn(`skip ${t}`, e); }
      }
      for (const t of agentIdTables) {
        try { await admin.from(t).delete().in("agent_id", allUserIds); } catch (e) { console.warn(`skip ${t}`, e); }
      }
      try { await admin.from("agents").delete().in("id", allUserIds); } catch (e) { console.warn("skip agents", e); }

      if (authUser) {
        try { await admin.auth.admin.deleteUser(authUser.id); } catch (e) { console.warn("skip auth", e); }
      }

      console.log(`[purge_user] ✓ Limpeza concluída para ${email}`);
      return json({ success: true, data: { removed: true, ids: allUserIds } });
    }

    // ===== IMMEDIATE TRANSFER =====
    if (action === "immediate_transfer") {
      const agentId = String(body?.agentId ?? "");
      const toUnitId = String(body?.toUnitId ?? "");
      const toTeam = String(body?.toTeam ?? "");
      
      if (!agentId || !toUnitId || !toTeam) {
        return json({ success: false, error: "agentId, toUnitId e toTeam são obrigatórios." }, 400);
      }

      console.log(`[immediate_transfer] Transferindo ${agentId} para ${toTeam}@${toUnitId}`);

      // Update agent immediately
      const { error } = await admin.from("agents").update({
        unit_id: toUnitId,
        team: toTeam,
        updated_at: new Date().toISOString(),
      }).eq("id", agentId);

      if (error) {
        console.error("[immediate_transfer] Erro:", error);
        return json({ success: false, error: error.message }, 400);
      }

      console.log(`[immediate_transfer] ✓ Transferência concluída`);
      return json({ success: true, data: {} });
    }

    if (action === "toggle_agent_status") {
      const agentId = String(body?.agentId ?? "");
      const isActive = Boolean(body?.isActive);
      if (!agentId) return json({ success: false, error: "agentId obrigatório." }, 400);

      const { error } = await admin.from("agents").update({ is_active: isActive }).eq("id", agentId);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: {} });
    }

    if (action === "freeze_agent") {
      const agentId = String(body?.agentId ?? "");
      const freeze = Boolean(body?.freeze);
      if (!agentId) return json({ success: false, error: "agentId obrigatório." }, 400);

      const updateData: Record<string, unknown> = {
        is_frozen: freeze,
        license_status: freeze ? "frozen" : "active",
        frozen_at: freeze ? new Date().toISOString() : null,
        frozen_by: freeze ? (auth.userId || null) : null,
      };

      if (!freeze) {
        updateData.unblocked_by = auth.userId || null;
        updateData.unblocked_at = new Date().toISOString();
      }

      const { error } = await admin.from("agents").update(updateData).eq("id", agentId);
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: {} });
    }

    if (action === "extend_license") {
      const agentId = String(body?.agentId ?? "");
      const months = Number(body?.months) || 1;
      if (!agentId) return json({ success: false, error: "agentId obrigatório." }, 400);

      const { data: agent } = await admin
        .from("agents")
        .select("license_expires_at")
        .eq("id", agentId)
        .maybeSingle();

      const currentExpiry = agent?.license_expires_at ? new Date(agent.license_expires_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + months * 30 * 24 * 60 * 60 * 1000);

      const { error } = await admin.from("agents").update({
        license_expires_at: newExpiry.toISOString().split("T")[0],
        license_status: "active",
        is_frozen: false,
      }).eq("id", agentId);

      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, data: { newExpiresAt: newExpiry.toISOString() } });
    }

    if (action === "reset_password") {
      const agentId = String(body?.agentId ?? "");
      const newPassword = String(body?.newPassword ?? "");
      if (!agentId || !newPassword) {
        return json({ success: false, error: "agentId e newPassword são obrigatórios." }, 400);
      }

      console.log(`[reset_password] Iniciando reset para: ${agentId}`);

      // Get agent data first
      const { data: agent } = await admin
        .from("agents")
        .select("cpf, name, email")
        .eq("id", agentId)
        .maybeSingle();

      if (!agent || !agent.cpf) {
        return json({ success: false, error: "Agente não encontrado." }, 404);
      }

      const email = `${agent.cpf}@agent.plantaopro.com`;

      // Check if auth user exists
      try {
        const { data: existingUser, error: getUserErr } = await admin.auth.admin.getUserById(agentId);
        
        if (getUserErr || !existingUser?.user) {
          console.log(`[reset_password] Usuário auth não existe, criando novo...`);
          
          // Create new auth user with the agent's ID
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email,
            password: newPassword,
            email_confirm: true,
            user_metadata: { full_name: agent.name },
          });

          if (createErr) {
            console.error(`[reset_password] Erro ao criar usuário:`, createErr);
            return json({ success: false, error: createErr.message }, 400);
          }

          const newUserId = created.user?.id;
          console.log(`[reset_password] Novo usuário criado: ${newUserId}`);

          // If created with different ID, update agent to match
          if (newUserId && newUserId !== agentId) {
            console.log(`[reset_password] Atualizando agent.id de ${agentId} para ${newUserId}`);
            
            // Update all references first
            const tables = [
              "agent_shifts", "overtime_bank", "shift_alerts", "agent_events",
              "agent_leaves", "notifications", "saved_credentials", "chat_messages"
            ];
            
            for (const table of tables) {
              try {
                const column = table === "chat_messages" ? "sender_id" : "agent_id";
                await admin.from(table).update({ [column]: newUserId }).eq(column, agentId);
              } catch {
                // ignore
              }
            }

            // Delete old agent and recreate with new ID
            await admin.from("agents").delete().eq("id", agentId);
            await admin.from("agents").insert({
              id: newUserId,
              name: agent.name,
              cpf: agent.cpf,
              email: agent.email,
              is_active: true,
              license_status: "active",
            });

            // Add user role
            try {
              await admin.from("user_roles").insert({ user_id: newUserId, role: "user" });
            } catch { /* ignore */ }
          }

          console.log(`[reset_password] ✓ Usuário criado e senha definida`);
          return json({ success: true, data: { created: true } });
        }

        // User exists, just update password
        console.log(`[reset_password] Usuário existe, atualizando senha...`);
        const { error: updateErr } = await admin.auth.admin.updateUserById(agentId, {
          password: newPassword,
        });

        if (updateErr) {
          console.error(`[reset_password] Erro ao atualizar senha:`, updateErr);
          return json({ success: false, error: updateErr.message }, 400);
        }

        console.log(`[reset_password] ✓ Senha atualizada com sucesso`);
        return json({ success: true, data: { updated: true } });

      } catch (err) {
        console.error(`[reset_password] Erro:`, err);
        return json({ success: false, error: "Erro ao processar reset de senha." }, 500);
      }
    }

    // ===== SYNC AGENT AUTH USER =====
    if (action === "sync_agent_auth") {
      const agentId = String(body?.agentId ?? "");
      const password = String(body?.password ?? "");
      
      if (!agentId || !password) {
        return json({ success: false, error: "agentId e password são obrigatórios." }, 400);
      }

      console.log(`[sync_agent_auth] Sincronizando usuário auth para: ${agentId}`);

      // Get agent data
      const { data: agent } = await admin
        .from("agents")
        .select("id, cpf, name, email, team, unit_id")
        .eq("id", agentId)
        .maybeSingle();

      if (!agent || !agent.cpf) {
        return json({ success: false, error: "Agente não encontrado." }, 404);
      }

      const email = `${agent.cpf}@agent.plantaopro.com`;

      // Check if auth user exists
      const { data: existingUser } = await admin.auth.admin.getUserById(agentId);

      if (existingUser?.user) {
        console.log(`[sync_agent_auth] Usuário já existe, atualizando senha...`);
        await admin.auth.admin.updateUserById(agentId, { password });
        return json({ success: true, data: { synced: true, existed: true } });
      }

      // Create new auth user
      console.log(`[sync_agent_auth] Criando novo usuário auth...`);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: agent.name },
      });

      if (createErr) {
        console.error(`[sync_agent_auth] Erro ao criar:`, createErr);
        return json({ success: false, error: createErr.message }, 400);
      }

      const newUserId = created.user?.id;
      
      // If new ID differs, we need to update agent record
      if (newUserId && newUserId !== agentId) {
        console.log(`[sync_agent_auth] ID divergente, atualizando agente...`);
        
        // Update agent ID
        await admin.from("agents").delete().eq("id", agentId);
        await admin.from("agents").insert({
          ...agent,
          id: newUserId,
        });
        
        // Add role
        try {
          await admin.from("user_roles").insert({ user_id: newUserId, role: "user" });
        } catch { /* ignore */ }
        
        return json({ success: true, data: { synced: true, newId: newUserId } });
      }

      // Add role
      try {
        await admin.from("user_roles").insert({ user_id: newUserId, role: "user" });
      } catch { /* ignore */ }

      console.log(`[sync_agent_auth] ✓ Usuário sincronizado`);
      return json({ success: true, data: { synced: true, existed: false } });
    }

    // ===== FORCE LOGOUT =====
    if (action === "force_logout") {
      const { user_id } = body ?? {};
      if (!user_id) return json({ success: false, error: "user_id obrigatório." }, 400);
      const { error } = await admin.auth.admin.signOut(user_id, "global");
      if (error) return json({ success: false, error: error.message }, 500);
      try {
        await admin.from("access_logs").insert({
          user_id,
          action: "force_logout",
          details: { by: auth.userId ?? "master" },
        });
      } catch { /* ignore */ }
      return json({ success: true });
    }

    // ===== DASHBOARD DATA (Master painel) =====
    // Consolida units + agents + users + logs + stats em uma única chamada,
    // usando service_role para bypassar RLS quando o master faz login por token.
    if (action === "list_dashboard_data") {
      const [unitsRes, agentsRes, profilesRes, rolesRes, logsRes, transfersRes, authUsersRes] = await Promise.all([
        admin.from("units").select("id, name, municipality, director_name, coordinator_name, address, email, phone").order("municipality").order("name"),
        admin.from("agents").select("id, name, cpf, matricula, email, phone, address, team, is_active, unit_id, approval_status, license_status, license_expires_at, license_notes, created_at, unit:units(name, municipality)").order("name"),
        admin.from("profiles").select("user_id, full_name, created_at"),
        admin.from("user_roles").select("user_id, role"),
        admin.from("access_logs").select("id, agent_id, action, created_at, ip_address, user_agent, agent:agents(name)").order("created_at", { ascending: false }).limit(100),
        admin.from("transfer_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        // Fonte autoritativa de "usuários do sistema" — profiles pode estar
        // vazia (não é populada automaticamente). Usa service_role via GoTrue
        // Admin API para listar todos os usuários reais de auth.users.
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

      if (unitsRes.error || agentsRes.error) {
        console.error("list_dashboard_data errors", { units: unitsRes.error, agents: agentsRes.error });
        return json({ success: false, error: "Falha ao carregar dados do painel." }, 500);
      }

      const agents = agentsRes.data ?? [];
      const now = Date.now();
      const expiredLicenses = agents.filter((a: any) => a.license_expires_at && new Date(a.license_expires_at).getTime() < now).length;
      const activeAgents = agents.filter((a: any) => a.is_active && a.approval_status === "approved").length;
      const pendingApprovals = agents.filter((a: any) => a.approval_status === "pending" || a.approval_status == null).length;

      const roleMap = new Map<string, string>();
      (rolesRes.data ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      const profileMap = new Map<string, any>();
      (profilesRes.data ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

      const authUsers = authUsersRes?.data?.users ?? [];
      if (authUsersRes?.error) {
        console.error("list_dashboard_data authUsers error", authUsersRes.error);
      }

      const users = authUsers.map((u: any) => {
        const prof = profileMap.get(u.id);
        return {
          id: u.id,
          email: u.email || prof?.full_name || "Sem e-mail",
          created_at: u.created_at ?? prof?.created_at ?? null,
          role: roleMap.get(u.id) ?? "user",
        };
      });

      return json({
        success: true,
        data: {
          units: unitsRes.data ?? [],
          agents,
          users,
          accessLogs: logsRes.data ?? [],
          stats: {
            totalUsers: users.length,
            totalAgents: agents.length,
            totalUnits: unitsRes.data?.length ?? 0,
            pendingTransfers: transfersRes.count ?? 0,
            activeAgents,
            expiredLicenses,
            pendingApprovals,
          },
        },
      });
    }

    // ===== SYNC USERS =====
    // Reindex auth.users with profiles + user_roles.
    if (action === "sync_users") {
      const authRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (authRes.error) {
        return json({ success: false, error: authRes.error.message }, 500);
      }
      const authUsers = authRes.data?.users ?? [];

      const [profilesRes, rolesRes] = await Promise.all([
        admin.from("profiles").select("user_id"),
        admin.from("user_roles").select("user_id"),
      ]);

      const existingProfiles = new Set((profilesRes.data ?? []).map((p: any) => p.user_id));
      const existingRoles = new Set((rolesRes.data ?? []).map((r: any) => r.user_id));

      const profilesToInsert = authUsers
        .filter((u: any) => !existingProfiles.has(u.id))
        .map((u: any) => ({ user_id: u.id, full_name: u.user_metadata?.full_name ?? null }));
      const rolesToInsert = authUsers
        .filter((u: any) => !existingRoles.has(u.id))
        .map((u: any) => ({ user_id: u.id, role: "user" }));

      let profilesInserted = 0;
      let rolesInserted = 0;

      if (profilesToInsert.length > 0) {
        const { error } = await admin.from("profiles").insert(profilesToInsert);
        if (error) return json({ success: false, error: `Falha ao inserir profiles: ${error.message}` }, 500);
        profilesInserted = profilesToInsert.length;
      }
      if (rolesToInsert.length > 0) {
        const { error } = await admin.from("user_roles").insert(rolesToInsert);
        if (error) return json({ success: false, error: `Falha ao inserir user_roles: ${error.message}` }, 500);
        rolesInserted = rolesToInsert.length;
      }

      return json({
        success: true,
        data: {
          totalAuthUsers: authUsers.length,
          profilesInserted,
          rolesInserted,
        },
      });
    }

    return json({ success: false, error: "Ação desconhecida." }, 400);
  } catch (err) {
    console.error("admin-operations error", err);
    return json({ success: false, error: "Erro interno." }, 500);
  }
});
