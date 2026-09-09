/**
 * Fundo institucional — usa a arte oficial fornecida pela Socioeducação do
 * Acre (agente + unidade) como textura de fundo, com mais presença que
 * antes, sob um wash em azul-marinho (mesmo matiz da logomarca) + um
 * toque pontual de vermelho, e vinheta central para o conteúdo continuar
 * legível por cima.
 */
import { memo } from 'react';
import sectionBackground from '@/assets/midias/section-background.png';

export const CommandRoomBackground = memo(function CommandRoomBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Arte institucional oficial — mais presente que antes (protagonismo),
          mas sempre atrás da vinheta central que protege a leitura. */}
      <img
        src={sectionBackground}
        alt=""
        loading="eager"
        decoding="async"
        className="crb-image absolute inset-0 h-full w-full object-cover object-[center_35%]"
      />

      {/* Wash tonal — azul-marinho da marca (troca de tom entre claro/escuro
          via classes .crb-*, ver index.css) */}
      <div className="crb-wash absolute inset-0" />

      {/* Toque pontual de vermelho da marca — canto inferior direito, bem sutil */}
      <div className="crb-red-glow absolute inset-0" />

      {/* Grade de pontos discreta — textura, não decoração */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(hsl(210 20% 60% / 0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Vinheta suave para foco central de conteúdo — mantém o texto e os
          cards legíveis mesmo com a foto de fundo mais presente. */}
      <div className="crb-vignette absolute inset-0" />
    </div>
  );
});
