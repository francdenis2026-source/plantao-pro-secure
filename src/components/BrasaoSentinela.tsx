import { CSSProperties } from "react";
import brandIcon from "@/assets/brand/plantaopro-ac-icon.png.asset.json";

interface BrasaoSentinelaProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
  title?: string;
}

/**
 * Símbolo oficial PlantãoPro AC. Fonte única de verdade da marca no app.
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
      <img
        src={brandIcon.url}
        alt={title}
        title={title}
        role="img"
        width={1536}
        height={1536}
        draggable={false}
        loading="eager"
        decoding="async"
        className={className}
        style={composedStyle}
      />
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
