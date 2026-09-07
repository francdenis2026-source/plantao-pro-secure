import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return json({ success: false, error: "Não autenticado" }, 401);
    }

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user?.id) {
      return json({ success: false, error: "Token inválido" }, 401);
    }

    const userId = userRes.user.id;

    // Fetch full agent profile for the authenticated user.
    // This avoids RLS-induced "not found" during hydration/approval transitions.
    const { data: agent, error: agentErr } = await admin
      .from("agents")
      .select(
        `
        id,
        name,
        cpf,
        matricula,
        email,
        phone,
        address,
        team,
        birth_date,
        age,
        is_active,
        unit_id,
        role,
        blood_type,
        avatar_url,
        is_frozen,
        approval_status,
        license_status,
        license_expires_at,
        license_notes,
        unit:units(
          id,
          name,
          municipality
        )
      `.trim(),
      )
      .eq("id", userId)
      .maybeSingle();

    if (agentErr) {
      console.error("agent-profile select error", agentErr);
      return json({ success: false, error: "Falha ao buscar perfil" }, 500);
    }

    if (!agent) {
      return json({ success: false, error: "Agente não encontrado" }, 404);
    }

    return json({ success: true, data: agent });
  } catch (err) {
    console.error("agent-profile error", err);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
