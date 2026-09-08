/**
 * Fundo institucional — camada única e discreta. Usa a arte oficial
 * fornecida pela Socioeducação do Acre (agente + unidade) como textura de
 * fundo, bem escurecida, sob um gradiente em ardósia + grade de pontos.
 */
import { memo } from 'react';
import sectionBackground from '@/assets/midias/section-background.png';

export const CommandRoomBackground = memo(function CommandRoomBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Arte institucional oficial — bem escurecida, só textura */}
      <img
        src={sectionBackground}
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.16]"
      />

      {/* Wash tonal — ardósia neutra, sem tons quentes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, hsl(222 18% 11% / 0.78) 0%, hsl(222 20% 6% / 0.86) 60%, hsl(222 22% 4% / 0.92) 100%)',
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
