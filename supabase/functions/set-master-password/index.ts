import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = "francdenisbr@gmail.com";
  const password = "franc2015";

  // find user
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let user = list.users.find((u) => (u.email || "").toLowerCase() === email);
  let created = false;

  if (!user) {
    const { data: c, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    user = c.user!;
    created = true;
  } else {
    const { error: uErr } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (uErr) return new Response(JSON.stringify({ error: uErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ensure master role
  await admin.from("user_roles").upsert({ user_id: user.id, role: "master" }, { onConflict: "user_id,role" });
  await admin.from("profiles").upsert({ user_id: user.id, full_name: "Franc D'nis" }, { onConflict: "user_id" });

  return new Response(JSON.stringify({ ok: true, created, user_id: user.id, email }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
