// Padroniza nomes de unidades para exibição no painel master e telas administrativas.
// Baseado nas 8 unidades socioeducativas do Acre atualmente cadastradas.
const UNIT_DISPLAY_MAP: Record<string, string> = {
  'CS JURUÁ': 'CS Juruá',
  'CS JURUA': 'CS Juruá',
  'CS FEIJÓ': 'CS Feijó',
  'CS FEIJO': 'CS Feijó',
  'CS ACRE': 'CS Acre',
  'CS AQUIRI': 'CS Aquiri',
  'CS BRASILÉIA': 'CS Brasiléia',
  'CS BRASILEIA': 'CS Brasiléia',
  'CS MOCINHA': 'CS Mocinha Magalhães',
  'CS MOCINHA MAGALHÃES': 'CS Mocinha Magalhães',
  'CS SANTA JULIANA': 'CS Santa Juliana',
  'CS PURUS': 'CS Purus',
  'CS SENA': 'CS Purus',
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
