-- =============================================================================
-- PLANTÃO PRO - DADOS DE SEED (EXEMPLO)
-- =============================================================================

-- =============================================================================
-- INSERIR UNIDADES
-- =============================================================================

INSERT INTO public.units (id, name, municipality, address, phone, email, director_name, coordinator_name) VALUES
  ('7e6b9c14-da70-4732-b6e3-51eccc751f2e', 'CS Acre', 'Rio Branco', 'Av. Brasil, 1000 - Centro', '(68) 3223-0001', 'cs.acre@ise.ac.gov.br', 'Dr. João Silva', 'Carlos Santos'),
  ('0b0d9d6c-dfd2-4d8b-af9b-95fae975645d', 'CS Aquiri', 'Rio Branco', 'Rua Amazonas, 500 - Bosque', '(68) 3223-0002', 'cs.aquiri@ise.ac.gov.br', 'Dra. Maria Oliveira', 'Ana Costa'),
  ('f8d78670-b19f-4654-8f10-e91c7ecbce88', 'CS Mocinha Magalhães', 'Rio Branco', 'Av. Ceará, 800 - Cidade Nova', '(68) 3223-0003', 'cs.mocinha@ise.ac.gov.br', 'Dr. Pedro Souza', 'José Lima'),
  ('64eb9fa7-c831-478c-b968-153aeb1b4a32', 'CS Santa Juliana', 'Rio Branco', 'Rua Quinari, 200 - Tancredo Neves', '(68) 3223-0004', 'cs.santajuliana@ise.ac.gov.br', 'Dra. Lucia Pereira', 'Roberto Nunes'),
  ('05ca3120-d095-4e30-832b-e3026a540fa1', 'UIP', 'Rio Branco', 'Av. Getúlio Vargas, 1500 - Centro', '(68) 3223-0005', 'uip@ise.ac.gov.br', 'Dr. Fernando Alves', 'Marcos Ribeiro'),
  ('6ea1a1cd-0cdc-4ce8-ad61-0f9cfa214966', 'CS Cruzeiro', 'Cruzeiro do Sul', 'Av. Mâncio Lima, 300 - Centro', '(68) 3322-0001', 'cs.cruzeiro@ise.ac.gov.br', 'Dr. Ricardo Mendes', 'Patricia Gomes'),
  ('dd77c458-92fb-49e2-819d-7a32288cc390', 'CS Feijó', 'Feijó', 'Rua Principal, 150 - Centro', '(68) 3463-0001', 'cs.feijo@ise.ac.gov.br', 'Dr. Antonio Ferreira', 'Sandra Melo'),
  ('e97e1711-27ca-412b-9c5a-6183fc51cc04', 'CS Sena', 'Sena Madureira', 'Av. Avelino Chaves, 400 - Centro', '(68) 3612-0001', 'cs.sena@ise.ac.gov.br', 'Dra. Claudia Rocha', 'Paulo Freitas'),
  ('f20f1979-19e4-4662-a97a-bf2d6a3283d9', 'CS Brasiléia', 'Brasiléia', 'Rua Raimundo Chaar, 100 - Centro', '(68) 3546-0001', 'cs.brasileia@ise.ac.gov.br', 'Dr. Marcos Dias', 'Fernanda Cruz');

-- =============================================================================
-- INSERIR MASTER ADMIN (Senha: master123)
-- =============================================================================

INSERT INTO public.master_admin (username, password_hash) VALUES
  ('admin', crypt('master123', gen_salt('bf'))),
  ('franc', crypt('franc1982', gen_salt('bf')));

-- =============================================================================
-- EXEMPLO DE AGENTES (Para testes)
-- Nota: Em produção, os agentes são criados via cadastro com auth.users
-- =============================================================================

-- Para inserir agentes de teste, você precisa primeiro criar o usuário no auth.users
-- e depois inserir o agente com o mesmo ID

-- Exemplo de estrutura (não executar diretamente):
/*
INSERT INTO public.agents (id, name, cpf, matricula, team, unit_id, role, blood_type, phone) VALUES
  ('uuid-do-auth-user', 'JOÃO DA SILVA', '12345678901', '123456789', 'ALFA', '7e6b9c14-da70-4732-b6e3-51eccc751f2e', 'team_leader', 'O+', '(68) 99999-0001'),
  ('uuid-do-auth-user', 'MARIA SANTOS', '98765432100', '987654321', 'BRAVO', '7e6b9c14-da70-4732-b6e3-51eccc751f2e', 'agent', 'A+', '(68) 99999-0002');
*/

-- =============================================================================
-- EXEMPLO DE SALA DE CHAT GLOBAL
-- =============================================================================

INSERT INTO public.chat_rooms (name, type, unit_id, team) VALUES
  ('Sistema ISE/ACRE - Todas as Unidades', 'all', NULL, NULL);

-- =============================================================================
-- INSTRUÇÕES DE IMPORTAÇÃO
-- =============================================================================

/*
COMO IMPORTAR NO SUPABASE EXTERNO:

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard

2. Crie um novo projeto (se ainda não existir)

3. Vá para SQL Editor (menu lateral)

4. Cole o conteúdo do arquivo "supabase_migration_complete.sql" e execute

5. Depois cole o conteúdo deste arquivo "supabase_seed_data.sql" e execute

6. Configure as variáveis de ambiente no seu frontend:
   - VITE_SUPABASE_URL: URL do projeto
   - VITE_SUPABASE_PUBLISHABLE_KEY: Anon key do projeto

7. Em Authentication > Settings:
   - Enable "Email Confirmations" = OFF (auto-confirm)
   - Site URL: URL do seu frontend

8. Em Authentication > URL Configuration:
   - Adicione as URLs de redirect permitidas

NOTA IMPORTANTE SOBRE AUTENTICAÇÃO:
Este sistema usa CPF como identificador principal.
O CPF é mapeado para email virtual: cpf@agent.plantaopro.com
Exemplo: CPF 12345678901 → 12345678901@agent.plantaopro.com
*/
