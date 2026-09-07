// Utilitários centralizados de licença.
// Objetivo: evitar expiração indevida quando o backend armazena apenas a data (YYYY-MM-DD).

export function isLicenseExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;

  // Se vier só a data (YYYY-MM-DD), considerar válido até o fim do dia.
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(expiresAt)
      ? new Date(`${expiresAt}T23:59:59.999`)
      : new Date(expiresAt);

  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
}
