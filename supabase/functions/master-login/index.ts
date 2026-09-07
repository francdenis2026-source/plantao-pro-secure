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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não suportado" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return json({ success: false, error: "Usuário e senha são obrigatórios." }, 400);
    }

    // Validate credentials using the DB function (server-side)
    const { data: ok, error: verifyError } = await admin.rpc("verify_master_admin", {
      p_username: username,
      p_password: password,
    });

    if (verifyError) {
      console.error("verify_master_admin error", verifyError);
      return json({ success: false, error: "Falha ao verificar credenciais." }, 500);
    }

    if (!ok) {
      return json({ success: false, error: "Usuário ou senha incorretos." }, 401);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8h

    const { error: insertError } = await admin.from("master_session_tokens").insert({
      // NOTE: user_id is not used for auth; keep a fixed sentinel.
      user_id: "00000000-0000-0000-0000-000000000001",
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("master_session_tokens insert error", insertError);
      return json({ success: false, error: "Não foi possível criar a sessão master." }, 500);
    }

    return json({ success: true, data: { token, expires_at: expiresAt.toISOString() } });
  } catch (err) {
    console.error("master-login error", err);
    return json({ success: false, error: "Erro interno." }, 500);
  }
});
