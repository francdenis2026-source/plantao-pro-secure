import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Foto real (Unsplash, licença livre) — substitui o asset quebrado do CDN do
// Lovable, que não é acessível fora da plataforma deles.
const IMG_URL = "https://images.unsplash.com/photo-1758956929717-e657fc784606?w=1600&q=80&fm=jpg&fit=crop";

interface CinematicBrandHeroProps {
  onScrollToLogin?: () => void;
  onMasterClick?: () => void;
}

/**
 * Seção institucional exibida abaixo do painel operacional na home.
 * Composição sóbria: imagem oficial à direita, mensagem e indicadores
 * institucionais à esquerda. Um único acento de cor (azul institucional).
 */
export function CinematicBrandHero({
  onScrollToLogin,
}: CinematicBrandHeroProps) {
  const navigate = useNavigate();
  const { user, masterSession } = useAuth();
  const isAuthenticated = !!user || !!masterSession;

  const scrollToTeams = () => {
    if (onScrollToLogin) {
      onScrollToLogin();
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrimary = () => {
    if (isAuthenticated) {
      navigate("/agent-panel");
      return;
    }
    scrollToTeams();
  };

  return (
    <section
      aria-label="PlantãoPro — Sistema de gestão de plantões"
      className="relative w-full overflow-hidden isolate"
      style={{
        minHeight: "clamp(440px, 64vh, 720px)",
        background: "hsl(222 20% 6%)",
      }}
    >
      <img
        src={IMG_URL}
        alt=""
        aria-hidden
        draggable={false}
        loading="eager"
        decoding="sync"
        // @ts-expect-error – fetchpriority é atributo HTML válido não tipado no React 18
        fetchpriority="high"
        className="absolute inset-0 w-full h-full select-none pointer-events-none origin-right sm:scale-[1.2] lg:scale-[1.28]"
        style={{
          objectFit: "cover",
          objectPosition: "center right",
          transformOrigin: "right center",
          filter: "saturate(0.85) contrast(1.02)",
        }}
      />

      {/* Overlay para legibilidade do texto */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, hsl(222 22% 4% / 0.96) 0%, hsl(222 20% 5% / 0.88) 32%, hsl(222 20% 5% / 0.55) 58%, hsl(222 20% 5% / 0.18) 80%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{ background: "linear-gradient(180deg, hsl(222 22% 4% / 0.85), transparent)" }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{ background: "linear-gradient(0deg, hsl(222 22% 4% / 0.85), transparent)" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl h-full min-h-[inherit] px-6 sm:px-10 lg:px-14 py-10 sm:py-12 lg:py-14 flex flex-col justify-center">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90 animate-fade-in"
            style={{ animationDelay: "80ms" }}
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span>Sistema Socioeducativo do Acre</span>
          </div>

          <h2
            className="mt-4 font-heading text-[clamp(1.9rem,3.6vw,3.1rem)] font-bold leading-[1.1] tracking-tight text-white animate-fade-in"
            style={{ animationDelay: "160ms" }}
          >
            Gestão de plantões com controle real e segurança institucional.
          </h2>

          <p
            className="mt-4 max-w-lg text-[15px] leading-[1.7] text-white/70 animate-fade-in"
            style={{ animationDelay: "260ms" }}
          >
            Escalas, banco de horas e rondas em um único sistema, feito para
            as unidades do Sistema Socioeducativo do Acre.
          </p>

          <div
            className="mt-7 grid grid-cols-3 gap-6 max-w-md animate-fade-in"
            style={{ animationDelay: "360ms" }}
          >
            {[
              { k: "9", v: "Unidades" },
              { k: "24/7", v: "Operação" },
              { k: "AES-256", v: "Criptografia" },
            ].map((m) => (
              <div key={m.v} className="flex flex-col">
                <span className="text-xl font-bold leading-none text-white">{m.k}</span>
                <span className="mt-1.5 text-[11px] uppercase tracking-wider text-white/50">{m.v}</span>
              </div>
            ))}
          </div>

          <div
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in"
            style={{ animationDelay: "460ms" }}
          >
            <button
              type="button"
              onClick={handlePrimary}
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Entrar no sistema
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/about")}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Saiba mais
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
