// Cron-invoked function: checks scheduled_rounds due to trigger and creates
// round_sessions + notifications for the target agents.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // Buscar agendamentos vencidos
    const { data: due, error: dueErr } = await supabase
      .from("scheduled_rounds")
      .select("*")
      .eq("is_enabled", true)
      .lte("next_trigger_at", nowIso)
      .limit(50);

    if (dueErr) throw dueErr;
    if (!due || due.length === 0) {
      return json({ triggered: 0 });
    }

    let triggeredCount = 0;
    const triggeredIds: string[] = [];

    for (const sched of due) {
      // Selecionar agentes alvo
      let agentQuery = supabase.from("agents").select("id, name, team, unit_id").eq("is_active", true);
      if (sched.unit_id) agentQuery = agentQuery.eq("unit_id", sched.unit_id);
      if (sched.team && sched.team !== "ALL") agentQuery = agentQuery.eq("team", sched.team);
      const { data: agents } = await agentQuery;
      if (!agents || agents.length === 0) {
        // Sem agentes; ainda assim atualizar last_triggered_at para não travar
        await supabase.from("scheduled_rounds").update({ last_triggered_at: nowIso }).eq("id", sched.id);
        continue;
      }

      // Criar round_sessions para cada agente
      const sessions = agents.map((a) => ({
        user_id: a.id,
        team: a.team ?? sched.team,
        mode: sched.round_mode,
        start_time: sched.round_start_time,
        end_time: sched.round_end_time,
        interval_min: sched.round_interval_min,
        rows: [],
        is_active: true,
        auto_started: true,
        scheduled_round_id: sched.id,
        require_confirmation_to_stop: sched.require_confirmation_to_stop,
      }));

      const { error: sessErr } = await supabase.from("round_sessions").insert(sessions);
      if (sessErr) {
        console.error("insert round_sessions error", sessErr);
        continue;
      }

      // Notificações
      const notifs = agents.map((a) => ({
        agent_id: a.id,
        title: "🚨 RONDA INICIADA AUTOMATICAMENTE",
        content: `${sched.name} — encerramento requer confirmação.`,
        type: "round_auto_start",
        is_read: false,
      }));
      await supabase.from("notifications").insert(notifs);

      // Atualizar last_triggered_at (trigger recalcula next_trigger_at)
      await supabase
        .from("scheduled_rounds")
        .update({ last_triggered_at: nowIso })
        .eq("id", sched.id);

      triggeredIds.push(sched.id);
      triggeredCount += agents.length;
    }

    return json({ triggered: triggeredCount, schedules: triggeredIds });
  } catch (err) {
    console.error("trigger-scheduled-rounds error", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
