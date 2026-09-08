/**
 * Fundo institucional — camada única, discreta, sem elementos decorativos
 * militares (sem radar, brasão, bússola ou laurel). Apenas um gradiente
 * sutil em ardósia com uma grade de pontos muito leve para dar textura.
 */
import { memo } from 'react';

// Foto real (Unsplash, licença livre) — sala de monitoramento, dá profundidade
// fotográfica discreta ao fundo institucional sem competir com o conteúdo.
const BG_PHOTO = 'https://images.unsplash.com/photo-1636868240132-442d20fd00e7?w=1920&q=60&fm=jpg&fit=crop';

export const CommandRoomBackground = memo(function CommandRoomBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Foto de fundo — muito escurecida, só textura */}
      <img
        src={BG_PHOTO}
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.24]"
      />

      {/* Wash tonal — ardósia neutra, sem tons quentes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, hsl(222 18% 11% / 0.72) 0%, hsl(222 20% 6% / 0.82) 60%, hsl(222 22% 4% / 0.9) 100%)',
        }}
      />

      {/* Grade de pontos discreta — textura, não decoração */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(hsl(210 20% 60% / 0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Vinheta suave para foco central de conteúdo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, hsl(222 22% 3% / 0.55) 100%)',
        }}
      />
    </div>
  );
});
