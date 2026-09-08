/**
 * Password strength heuristic tailored for Plantão Pro.
 * Penalizes senhas iguais ao CPF, sequências óbvias e comuns.
 * Retorna score 0-4 e sugestões em português.
 */

const COMMON = new Set([
  '12345678', '123456789', '01234567', '11111111', '00000000',
  'password', 'senha123', 'qwerty', 'abcdef', 'admin123',
]);

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Muito fraca' | 'Fraca' | 'Razoável' | 'Forte' | 'Excelente';
  color: string;
  issues: string[];
  ok: boolean;
};

export function checkPasswordStrength(
  password: string,
  opts: { cpf?: string; minLength?: number } = {}
): PasswordStrength {
  const min = opts.minLength ?? 8;
  const issues: string[] = [];

  if (!password || password.length < min) issues.push(`Use pelo menos ${min} caracteres.`);
  if (!/[A-Za-z]/.test(password)) issues.push('Inclua ao menos uma letra.');
  if (!/[0-9]/.test(password)) issues.push('Inclua ao menos um número.');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('Um símbolo torna a senha mais forte.');
  if (opts.cpf && password.replace(/\D/g, '') === opts.cpf.replace(/\D/g, '')) {
    issues.push('Não use o seu CPF como senha.');
  }
  if (COMMON.has(password.toLowerCase())) issues.push('Senha muito comum — escolha outra.');
  if (/^(.)\1+$/.test(password)) issues.push('Evite repetir o mesmo caractere.');
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(password)) {
    issues.push('Evite sequências óbvias.');
  }

  let score = 0;
  if (password.length >= min) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  if (issues.some((i) => i.includes('CPF') || i.includes('comum'))) score = Math.min(score, 1);

  const s = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;
  const labels: PasswordStrength['label'][] = [
    'Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Excelente',
  ];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];

  return {
    score: s,
    label: labels[s],
    color: colors[s],
    issues,
    ok: s >= 2 && issues.length === 0,
  };
}
