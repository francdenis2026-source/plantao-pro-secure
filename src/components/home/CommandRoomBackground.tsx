/**
 * Fundo institucional — camada única, discreta, sem elementos decorativos
 * militares (sem radar, brasão, bússola ou laurel). Apenas um gradiente
 * sutil em ardósia com uma grade de pontos muito leve para dar textura.
 */
import { memo } from 'react';

export const CommandRoomBackground = memo(function CommandRoomBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
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
