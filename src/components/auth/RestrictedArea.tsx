import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import restrictedBg from "@/assets/restricted-area-bg.jpg";

interface RestrictedAreaProps {
  title?: string;
  message?: string;
  /** Avisos institucionais (unidades do Acre) exibidos antes do acesso. */
  notices?: Array<{ unit: string; text: string }>;
}

const DEFAULT_NOTICES: Array<{ unit: string; text: string }> = [
  { unit: "ISE Rio Branco", text: "Operação normal — efetivo em prontidão." },
  { unit: "ISE Feijó", text: "Plantão ativo — rádio 24/7 operante." },
  { unit: "ISE Cruzeiro do Sul", text: "Sem ocorrências nas últimas 24h." },
 { unit: "ISE Sena Madureira", text: "Rotina institucional estável." },
 { unit: "ISE Brasiléia", text: "Fronteira monitorada — equipe em turno." },
];

/**
 * Tela institucional exibida quando um visitante não autenticado
 * tenta acessar uma área restrita do sistema.
 */
export const RestrictedArea: React.FC<RestrictedAreaProps> = ({
  title = "Área Restrita",
  message = "Acesso exclusivo a agentes autenticados.",
  notices = DEFAULT_NOTICES,
}) => {
  const navigate = useNavigate();
  return (
    <main
      role="alert"
      aria-labelledby="restricted-title"
      className="relative min-h-[60vh] flex items-center justify-center px-4 py-8 overflow-hidden"
    >
      <img
        src={restrictedBg}
        alt=""
        aria-hidden
        loading="lazy"
        width={1536}
        height={1024}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative max-w-sm w-full text-center space-y-4">
        <svg
          viewBox="0 0 96 96"
          className="mx-auto h-14 w-14 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path
            d="M48 6 L82 20 V46 C82 66 68 82 48 90 C28 82 14 66 14 46 V20 Z"
            fill="hsl(var(--primary) / 0.08)"
          />
          <rect x="34" y="46" width="28" height="22" rx="3" />
          <path d="M40 46 V36 a8 8 0 0 1 16 0 V46" />
          <circle cx="48" cy="56" r="2" fill="currentColor" />
          <path d="M48 58 v5" />
        </svg>
        <div className="space-y-1">
          <h1
            id="restricted-title"
            className="text-base font-bold uppercase tracking-[0.2em] text-primary"
          >
            {title}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {notices.length > 0 && (
          <section
            aria-label="Status operacional das unidades"
            className="text-left rounded-md border border-border/50 bg-card/50 backdrop-blur px-3 py-2.5 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
                Status Operacional
              </h2>
              <span className="flex items-center gap-1 text-[9px] font-mono uppercase text-emerald-500/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ao vivo
              </span>
            </div>
            <ul className="space-y-1">
              {notices.map((n) => (
                <li
                  key={n.unit}
                  className="text-[11px] text-muted-foreground flex gap-1.5 leading-snug"
                >
                  <span className="font-semibold text-foreground/85 shrink-0">
                    {n.unit}:
                  </span>
                  <span className="truncate">{n.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Button onClick={() => navigate("/")} variant="outline" size="sm">
            Voltar à Home
          </Button>
          <Button onClick={() => navigate("/auth")} size="sm">
            Entrar no sistema
          </Button>
        </div>
      </div>
    </main>
  );
};


export default RestrictedArea;
