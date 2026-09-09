import { CSSProperties } from "react";

interface BrasaoSentinelaProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
  title?: string;
}

/**
 * Símbolo oficial PlantãoPro AC. Fonte única de verdade da marca no app.
 *
 * Desenhado como SVG inline (escudo + P + estrela, sem cromado/bisel/brilho)
 * em vez de importar um PNG do CDN — fica nítido em qualquer tamanho e é o
 * mesmo traço usado no favicon e nos ícones de app em public/.
 */
export function BrasaoSentinela({
  size = 96,
  className,
  style,
  animated = false,
  title = "PlantãoPro — Instituto Socioeducativo do Acre",
}: BrasaoSentinelaProps) {
  const dim = typeof size === "number" ? `${size}px` : size;

  const composedStyle: CSSProperties = {
    width: dim,
    height: dim,
    filter: "drop-shadow(0 6px 18px rgba(15,23,42,0.28))",
    ...(animated
      ? {
          animation:
            "brasaoIn 900ms cubic-bezier(.22,1,.36,1) both, brasaoFloat 6s ease-in-out 900ms infinite",
        }
      : {}),
    ...style,
  };

  return (
    <>
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={title}
        className={className}
        style={composedStyle}
      >
        <title>{title}</title>
        <path d="M100 15 L170 35 L170 110 Q170 150 100 190 Q30 150 30 110 L30 35 Z" fill="#0E2A5C" stroke="#2F6FED" strokeWidth="4" />
        <path d="M148,32 L151.82,42.74 L163.22,43.06 L154.18,50.01 L157.4,60.94 L148,54.5 L138.6,60.94 L141.82,50.01 L132.78,43.06 L144.18,42.74 Z" fill="#ffffff" />
        <rect x="55" y="45" width="35" height="115" rx="7" fill="#ffffff" />
        <path d="M 84.67 54.67 A 33 33 0 1 1 84.67 101.33" fill="none" stroke="#ffffff" strokeWidth="30" strokeLinecap="round" />
        <path d="M 55 128 L 88 160 L 55 160 Z" fill="#D62839" />
      </svg>
      {animated && (
        <style>{`
          @keyframes brasaoIn {
            0%   { opacity: 0; transform: scale(0.82) translateY(6px); }
            60%  { opacity: 1; transform: scale(1.03) translateY(-1px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes brasaoFloat {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-3px); }
          }
        `}</style>
      )}
    </>
  );
}

export default BrasaoSentinela;
