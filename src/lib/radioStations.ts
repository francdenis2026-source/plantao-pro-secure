export interface RadioStation {
  id: string;
  name: string;
  subtitle: string;
  /** Stream de áudio primário (Zeno.FM). */
  streamUrl: string;
  /** Espelho automático — usado se o stream primário falhar. */
  fallbackUrl: string;
  /** Endpoint SSE de metadados ("tocando agora"). */
  metadataUrl: string;
  /** Página oficial da rádio, para abrir em nova aba. */
  siteUrl: string;
}

// Estação padrão do player institucional. No futuro pode ser sobrescrita
// dinamicamente por uma tabela `radio_stations` no Supabase, permitindo ao
// admin trocar a rádio ativa sem alterar código.
export const DEFAULT_STATION: RadioStation = {
  id: 'c45wbq2us3buv',
  name: 'Rádio PlantãoPro',
  subtitle: 'Ao vivo',
  streamUrl: 'https://stream.zeno.fm/c45wbq2us3buv',
  fallbackUrl: 'https://stream-284.zeno.fm/c45wbq2us3buv',
  metadataUrl: 'https://api.zeno.fm/mounts/metadata/subscribe/c45wbq2us3buv',
  // Sem página institucional própria confirmada — reaproveita o stream direto.
  siteUrl: 'https://stream.zeno.fm/c45wbq2us3buv',
};
