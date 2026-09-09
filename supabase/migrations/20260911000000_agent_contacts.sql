-- "Meus Contatos" — ficha pessoal do agente (e-mail, celular, contato de
-- emergência e informações importantes), editável só pelo próprio agente.
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS important_notes TEXT;

-- A política antiga de update ("Agents can update own record") comparava
-- cpf com o e-mail sintético — quebrou quando o login passou a usar
-- matrícula em vez de CPF (o e-mail sintético virou <matricula>@agent...).
-- agents.id é criado igual ao auth.uid() (ver useAgentProfile), então essa
-- é a comparação correta e não depende do formato do e-mail.
CREATE POLICY "Agents can update own record by id"
  ON public.agents FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
