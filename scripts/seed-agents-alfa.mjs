// Mesmo padrão de scripts/seed-agents.mjs — equipe ALFA, unidade CS Feijó.
// Usuário/senha inicial = 6 primeiros dígitos da matrícula.
//
// Uso:
//   SUPABASE_URL="https://xxxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role" \
//   node scripts/seed-agents-alfa.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar este script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UNIT_CS_FEIJO = 'dd77c458-92fb-49e2-819d-7a32288cc390';

// Equipe ALFA, Unidade CS Feijó.
const AGENTS = [
  { name: 'Ana Caritas Leão', matricula: '96318790', position: 'Agente Socioeducativo', team: 'ALFA' },
  { name: 'Alcirley de Lima Viana', matricula: '92010843', position: 'Agente Socioeducativo (Apoio)', team: 'ALFA' },
  { name: 'Luciano da Silva Bezerra', matricula: '963940301', position: 'Agente Socioeducativo', team: 'ALFA' },
  { name: 'Tiago Santos dos Santos', matricula: '94967695', position: 'Agente Socioeducativo', team: 'ALFA' },
  { name: 'Dejacir Mota da Silva', matricula: '94835352', position: 'Chefe de Equipe', team: 'ALFA' },
];

function loginCode(matricula) {
  return matricula.replace(/\D/g, '').slice(0, 6);
}

async function seedAgent(agent) {
  const code = loginCode(agent.matricula);
  const email = `${code}@agent.plantaopro.com`;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: code,
    email_confirm: true,
    user_metadata: { full_name: agent.name },
  });

  if (createErr) {
    console.error(`✗ ${agent.name}: falha ao criar login (${createErr.message})`);
    return;
  }

  const userId = created.user.id;

  const { error: agentErr } = await supabase.from('agents').insert({
    id: userId,
    name: agent.name,
    matricula: agent.matricula,
    team: agent.team,
    position: agent.position,
    role: 'agent',
    unit_id: UNIT_CS_FEIJO,
    is_active: true,
  });

  if (agentErr) {
    console.error(`✗ ${agent.name}: login criado, mas falhou o cadastro do agente (${agentErr.message}) — remova o usuário órfão em auth.users manualmente.`);
    return;
  }

  console.log(`✓ ${agent.name} — usuário: ${code} — senha inicial: ${code}`);
}

for (const agent of AGENTS) {
  await seedAgent(agent);
}

console.log('\nConcluído.');
