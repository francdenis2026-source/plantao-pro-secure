// Padroniza nomes de unidades para exibição no painel master e telas administrativas.
// Baseado nas 9 unidades socioeducativas do Acre.
const UNIT_DISPLAY_MAP: Record<string, string> = {
  'CS CZS': 'CS Cruzeiro do Sul',
  'CS FEIJÓ': 'CS Feijó',
  'CS FEIJO': 'CS Feijó',
  'CS ACRE': 'CS Acre',
  'CS AQUIRI': 'CS Aquiri',
  'CS BRASILÉIA': 'CS Brasiléia',
  'CS BRASILEIA': 'CS Brasiléia',
  'CS MOCINHA': 'CS Mocinha',
  'CS SANTA JULIANA': 'CS Santa Juliana',
  'CS SENA': 'CS Sena Madureira',
  'UIP - RIO BRANCO': 'UIP - Rio Branco',
  'UIP RIO BRANCO': 'UIP - Rio Branco',
};

export function formatUnitName(raw?: string | null): string {
  if (!raw) return '—';
  const key = raw.trim().toUpperCase();
  return UNIT_DISPLAY_MAP[key] ?? raw.trim();
}

export function formatUnitLabel(unit?: { name?: string | null; municipality?: string | null } | null): string {
  if (!unit?.name) return '—';
  const name = formatUnitName(unit.name);
  return unit.municipality ? `${name} · ${unit.municipality}` : name;
}
