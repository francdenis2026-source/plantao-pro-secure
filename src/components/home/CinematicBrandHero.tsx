import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import splashAsset from "@/assets/brand/plantaopro-splash.jpg.asset.json";
import splashAvif from "@/assets/brand/plantaopro-splash.avif.asset.json";
import splashWebp from "@/assets/brand/plantaopro-splash.webp.asset.json";
import { useAuth } from "@/contexts/AuthContext";

const IMG_URL = splashAsset.url;
const IMG_AVIF = splashAvif.url;
const IMG_WEBP = splashWebp.url;

interface CinematicBrandHeroProps {
  onScrollToLogin?: () => void;
  onMasterClick?: () => void;
}

/**
 * CinematicBrandHero — seção institucional fullscreen exibida abaixo dos
 * cards operacionais na home. Utiliza a arte oficial (agente + viatura +
 * wordmark) como background com overlay escuro à esquerda para legibilidade.
 * CTAs sobrepostos direcionam o usuário para as ações principais.
 * Responsivo: desktop = 85vh, mobile = 70vh com foco reajustado.
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
      // Usuário logado → painel do agente
      navigate("/agent-panel");
      return;
    }
    // Não logado → rola até os cards das equipes (topo da home)
    scrollToTeams();
  };

  return (
    <section
      aria-label="PlantãoPro — Controle profissional de plantão"
      className="relative w-full overflow-hidden isolate"
      style={{
        minHeight: "clamp(460px, 68vh, 760px)",
        background: "#050505",
      }}
    >
      {/* Background: imagem institucional.
          Desktop (sm+): scale up ancorado à direita para dar mais protagonismo
          ao agente + viatura sem afetar os elementos ao redor (texto e CTAs
          permanecem à esquerda, fora do foco visual do zoom). */}
      <picture>
        <source srcSet={IMG_AVIF} type="image/avif" />
        <source srcSet={IMG_WEBP} type="image/webp" />
        <img
          src={IMG_URL}
          alt=""
          aria-hidden
          draggable={false}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full select-none pointer-events-none origin-right sm:scale-[1.28] lg:scale-[1.38] xl:scale-[1.45]"
          style={{
            objectFit: "cover",
            objectPosition: "center right",
            transformOrigin: "right center",
          }}
        />
      </picture>


      {/* Overlay escuro (esquerda → direita) para legibilidade dos CTAs */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(3,5,10,0.94) 0%, rgba(3,5,10,0.82) 28%, rgba(3,5,10,0.45) 55%, rgba(3,5,10,0.15) 80%, transparent 100%)",
        }}
      />

      {/* Overlay base (topo/rodapé) para transição suave com o resto da página */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(3,5,10,0.9), transparent)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(0deg, rgba(3,5,10,0.9), transparent)",
        }}
      />

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto max-w-7xl h-full min-h-[inherit] px-6 sm:px-10 lg:px-14 py-10 sm:py-12 lg:py-14 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] gap-10 lg:gap-16 items-center">
          <div className="max-w-xl sm:max-w-2xl">
            {/* Badge institucional */}
            <div
              className="inline-flex items-center gap-2 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.32em] text-amber-300 backdrop-blur-sm animate-fade-in"
              style={{ animationDelay: "80ms" }}
            >
              <ShieldCheck className="h-3 w-3" strokeWidth={2.4} />
              <span>ISE · Acre · Operacional</span>
            </div>

            {/* Título */}
            <h2
              className="mt-4 font-serif text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.06] tracking-tight text-white animate-fade-in"
              style={{
                fontFamily:
                  "'Libre Baskerville', 'Playfair Display', Georgia, serif",
                animationDelay: "180ms",
                textShadow: "0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              Comando em suas mãos.{" "}
              <span
                style={{
                  background:
                    "linear-gradient(180deg, #f4c974 0%, #c9922b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Disciplina em cada plantão.
              </span>
            </h2>

            {/* Subtítulo */}
            <p
              className="mt-4 max-w-lg text-[clamp(0.9rem,0.6vw+0.55rem,1.05rem)] leading-[1.65] text-white/75 animate-fade-in"
              style={{ animationDelay: "300ms" }}
            >
              Sistema profissional de controle de plantão, escala e banco de horas
              para o Sistema Socioeducativo. Feito para quem está na linha de
              frente.
            </p>


            {/* Métricas curtas */}
            <div
              className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 animate-fade-in"
              style={{ animationDelay: "400ms" }}
            >
              {[
                { k: "9", v: "Unidades" },
                { k: "24/7", v: "Operacional" },
                { k: "AES-256", v: "Sigilo total" },
              ].map((m) => (
                <div key={m.v} className="flex flex-col">
                  <span
                    className="font-mono text-lg font-bold leading-none text-amber-300"
                    style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
                  >
                    {m.k}
                  </span>
                  <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-white/60">
                    {m.v}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-fade-in"
              style={{ animationDelay: "520ms" }}
            >
              <button
                type="button"
                onClick={handlePrimary}
                className="group inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={{
                  background:
                    "linear-gradient(135deg, #f4c974 0%, #c9922b 100%)",
                  boxShadow:
                    "0 10px 30px -8px rgba(244,201,116,0.55), 0 2px 6px rgba(0,0,0,0.4)",
                }}
              >
                Entrar no Plantão
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={2.6}
                />
              </button>

              <button
                type="button"
                onClick={() => navigate("/about")}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Conhecer o Sistema
              </button>
            </div>

            {/* Rodapé da seção — assinatura discreta */}
            <div
              className="mt-8 flex items-center gap-3 animate-fade-in"
              style={{ animationDelay: "700ms" }}
            >
              <span className="h-px w-8 bg-amber-500/50" />
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/45">
                PlantãoPro · Sistema Socioeducativo do Acre
              </span>
            </div>
          </div>

          {/* Coluna lateral tática (desktop only) — preenche o vazio à direita
              com uma stack de destaques operacionais em HUD, sem competir com
              o agente da imagem de fundo. */}
          <aside
            className="hidden lg:block relative animate-fade-in"
            style={{ animationDelay: "600ms" }}
            aria-label="Destaques operacionais"
          >
            <div className="relative rounded-lg border border-amber-400/25 bg-[linear-gradient(160deg,rgba(10,17,40,0.72)_0%,rgba(3,5,10,0.85)_100%)] backdrop-blur-md p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(234,179,8,0.1)]">
              {/* corner brackets */}
              <span aria-hidden className="absolute top-0 left-0 h-3 w-3 border-t border-l border-amber-400/70" />
              <span aria-hidden className="absolute top-0 right-0 h-3 w-3 border-t border-r border-amber-400/70" />
              <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-amber-400/70" />
              <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-amber-400/70" />

              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300">
                  Painel de Comando
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Ativo
                </span>
              </div>

              <ul className="space-y-3">
                {[
                  { k: "Escala inteligente", v: "Trocas assinadas digitalmente" },
                  { k: "Banco de horas", v: "Ciclos quinzenais auditáveis" },
                  { k: "Ronda georreferenciada", v: "Gestão com QR + registro" },
                  { k: "Segurança institucional", v: "RLS · TLS 1.3 · AES-256" },
                ].map((it) => (
                  <li key={it.k} className="relative pl-3 border-l-2 border-amber-400/40">
                    <div className="font-sans text-[13px] font-bold uppercase tracking-[0.06em] text-white leading-tight">
                      {it.k}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55 mt-0.5">
                      {it.v}
                    </div>
                  </li>
                ))}
              </ul>

              {/* barcode strip */}
              <div className="mt-5 pt-3 border-t border-amber-400/15 flex items-end gap-[2px] h-3 opacity-70">
                {[3,7,4,9,5,3,8,4,6,3,9,4,7,5,3,6,4,8].map((h, i) => (
                  <span key={i} className="block w-[2px] bg-amber-400/70 shrink-0" style={{ height: `${h * 10}%` }} />
                ))}
                <span className="ml-auto pl-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-300 shrink-0">
                  OP · SECURE
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
