// Cria agentes reais (auth + perfil) a partir de uma lista de matrículas.
// Usuário de login = 6 primeiros dígitos da matrícula. Senha inicial = os
// mesmos 6 dígitos (o agente pode trocar depois, uma única vez, no painel).
//
// Roda LOCALMENTE, com a service role key do seu projeto Supabase — essa
// chave nunca deve ser compartilhada, colada em chat, ou commitada.
//
// Uso:
//   SUPABASE_URL="https://xxxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role" \
//   node scripts/seed-agents.mjs
//
// A service role key fica em Project Settings > API > service_role, no
// painel do Supabase. NÃO é a "anon/publishable key" que o app usa no browser.

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

// unit_id de "CS Feijó" (supabase_seed_data.sql). Troque se a unidade real
// no seu banco tiver outro id.
const UNIT_CS_FEIJO = 'dd77c458-92fb-49e2-819d-7a32288cc390';

// Equipe BRAVO, Unidade CS Feijó — confirme os números de matrícula antes de
// rodar; o script usa exatamente os 6 primeiros dígitos como login e senha.
const AGENTS = [
  { name: 'Eliabi Silva de Souza', matricula: '96860461', position: 'Agente Socioeducativo', team: 'BRAVO' },
  { name: 'André dos Santos da Silva', matricula: '9683862', position: 'Agente Socioeducativo', team: 'BRAVO' },
  { name: 'Franc Denis Barroso de Oliveira', matricula: '9108092', position: 'Agente Socioeducativo', team: 'BRAVO' },
  { name: 'João Paulo Linhares de Sousa', matricula: '96833867', position: 'Agente Socioeducativo', team: 'BRAVO' },
  { name: 'Randerson Castro Moreira', matricula: '93011198', position: 'Chefe de Equipe', team: 'BRAVO' },
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

console.log('\nConcluído. Avise os agentes: usuário e senha inicial são os 6 primeiros dígitos da matrícula funcional.');
