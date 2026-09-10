import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Calendar, Clock, Users, RefreshCw, BarChart3, Target,
  Mail, ShieldCheck, Zap, Lock, MapPin, Code2,
} from 'lucide-react';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';
import aboutHero from '@/assets/about-hero.jpg';

const features = [
  { icon: Calendar, title: 'Plantões', description: 'Visualização em tempo real e alertas de próximas escalas.' },
  { icon: BarChart3, title: 'Escalas', description: 'Acompanhamento completo da equipe e da unidade.' },
  { icon: Clock, title: 'Banco de Horas', description: 'Créditos, débitos e histórico auditável.' },
  { icon: RefreshCw, title: 'Permutas', description: 'Trocas de plantão solicitadas e rastreadas.' },
  { icon: Users, title: 'Equipes', description: 'Chat interno e status de membros ativos.' },
  { icon: Target, title: 'Rondas', description: 'Registro georreferenciado de rondas e ocorrências.' },
];

const specs = [
  { label: 'Unidades atendidas', value: '09' },
  { label: 'Natureza', value: 'Institucional' },
  { label: 'Disponibilidade', value: 'Web + App' },
  { label: 'Domínio', value: 'acplantao.online' },
];

const pillars = [
  { icon: ShieldCheck, text: 'Seguro' },
  { icon: Zap, text: 'Rápido' },
  { icon: Lock, text: 'Privado' },
];

const SERIF = '"Libre Baskerville", Georgia, serif';
const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", "Inter", system-ui, sans-serif';

export default function About() {
  const navigate = useNavigate();
  return (
    <div
      className="h-[100dvh] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] sm:h-screen sm:overflow-hidden relative bg-background flex flex-col"
      style={{ fontFamily: SANS }}
    >
      {/* Fundo fixo — a foto fica visível nos dois temas (tingida de azul
          no modo claro, não "lavada" para um branco chapado sem vida). */}
      <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url(${aboutHero})` }} aria-hidden />
      <div className="fixed inset-0 -z-10 bg-background/90 dark:bg-background/94" aria-hidden />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.10),transparent_60%)]" aria-hidden />

      {/* Header — paddingTop cobre a status bar do PWA instalado (notch do
          iPhone / barra de status do Android), senão o botão Voltar fica
          escondido atrás dela quando o app roda em modo standalone. */}
      <header
        className="w-full border-b border-primary/15 bg-background/90 backdrop-blur-xl flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="container flex h-10 max-w-6xl items-center justify-between px-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <span className="text-[10px] uppercase tracking-[0.28em] text-primary" style={{ fontFamily: MONO }}>Sobre · PlantãoPro</span>
        </div>
      </header>

      <main className="container relative max-w-6xl px-3 py-2 pb-3 space-y-2 flex-1 sm:overflow-hidden sm:flex sm:flex-col sm:min-h-0">
        {/* HERO — tratamento escuro fixo nos dois temas: é uma foto, texto
            claro sobre overlay escuro garante contraste sempre, em vez de
            depender de tokens que invertem com o tema por trás de uma
            imagem que não inverte. */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/25 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex-shrink-0">
          <div className="absolute inset-0">
            <img src={aboutHero} alt="Centro de operações do PlantãoPro" className="h-full w-full object-cover" width={1920} height={1088} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050a18]/95 via-[#050a18]/82 to-[#050a18]/55" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.22),transparent_55%)]" />
          </div>
          <div className="relative flex items-center gap-3 px-4 py-2.5 md:gap-6 md:px-8 md:py-4">
            <BrasaoSentinela size={44} title="PlantãoPro" className="flex-shrink-0 md:!h-14 md:!w-14" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[8px] uppercase tracking-[0.22em] text-primary-foreground ring-1 ring-primary/50 md:px-2.5 md:text-[9px] md:tracking-[0.3em]" style={{ fontFamily: MONO, backgroundColor: 'hsl(var(--primary) / 0.35)' }}>
                Sistema Socioeducativo · Acre
              </p>
              <h1 className="text-xl font-normal tracking-tight text-white md:text-3xl leading-none" style={{ fontFamily: SERIF }}>
                Plantão<span className="text-primary">Pro</span>
              </h1>
              <p className="text-[11px] leading-snug text-slate-300 md:text-[13px] max-w-2xl">
                Plataforma operacional para agentes socioeducativos gerirem plantões, escalas, rondas e banco de horas com precisão e rastreabilidade.
              </p>
            </div>
            <div className="hidden md:flex flex-col gap-1.5 flex-shrink-0 pl-4 border-l border-white/15">
              {pillars.map((p) => (
                <div key={p.text} className="flex items-center gap-1.5 text-[11px] text-slate-100">
                  <p.icon className="h-3 w-3 text-primary" />
                  <span style={{ fontFamily: MONO }} className="uppercase tracking-wider text-[10px]">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:flex-1 lg:min-h-0">
          {/* Features */}
          <div className="lg:col-span-2 rounded-2xl border border-primary/15 bg-card p-3 md:p-4 lg:overflow-y-auto">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ fontFamily: MONO }}>
              Módulos da Plataforma
            </h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl border border-border bg-background p-2.5">
                  <f.icon className="mb-1.5 h-4 w-4 text-primary" />
                  <p className="text-[12px] font-semibold text-foreground">{f.title}</p>
                  <p className="text-[10.5px] leading-snug text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar: Origem / Specs / Contato */}
          <div className="space-y-2 lg:overflow-y-auto">
            <div className="rounded-2xl border border-primary/15 bg-card p-3 md:p-4">
              <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ fontFamily: MONO }}>
                Sobre o Desenvolvedor
              </h2>
              <p className="text-[11px] leading-relaxed text-foreground/85">
                O PlantãoPro é desenvolvido por <strong className="font-semibold text-foreground">Franc Denis</strong>, Agente Socioeducativo em atuação na unidade de Feijó/AC. Por viver a mesma rotina de plantões, escalas e rondas que a plataforma organiza, ele conhece de dentro os problemas que o sistema resolve — não é um software genérico adaptado depois, é uma ferramenta pensada por quem também usa.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-foreground/85">
                O objetivo é simples: dar a cada agente socioeducativo do Acre visibilidade clara da própria escala, controle sobre banco de horas e permutas, e um canal direto com a equipe — tudo em um único lugar, acessível pelo celular ou computador.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary ring-1 ring-primary/25">Feito por um agente, para agentes</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary ring-1 ring-primary/25">Uso operacional diário</span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-card p-3 md:p-4">
              <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ fontFamily: MONO }}>
                Ficha Técnica
              </h2>
              <div className="grid grid-cols-2 gap-1.5">
                {specs.map((s) => (
                  <div key={s.label} className="rounded-lg border border-border bg-background px-2 py-1.5">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="text-[12px] font-semibold text-foreground" style={{ fontFamily: MONO }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-card p-3 md:p-4">
              <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ fontFamily: MONO }}>
                Contato
              </h2>
              <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                Dúvidas, sugestões ou suporte operacional — fale diretamente com o desenvolvedor.
              </p>
              <a href="mailto:plantaopro@proton.me">
                <Button size="sm" variant="outline" className="w-full gap-1.5 border-primary/30 text-xs text-primary hover:bg-primary/10">
                  <Mail className="h-3.5 w-3.5" /> Enviar e-mail
                </Button>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex-shrink-0 border-t border-primary/15 bg-background/95 backdrop-blur-xl">
        <div className="container max-w-6xl px-3 py-2">
          <p className="text-center text-[9.5px] leading-relaxed text-foreground/60">
            Iniciativa independente de um agente socioeducativo — não é o aplicativo oficial do ISE nem representa o Governo do Estado do Acre. Uso gratuito e sem garantia de disponibilidade contínua. Seguimos boas práticas de segurança (TLS 1.3, LGPD).
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-foreground">
            <Code2 className="h-3 w-3 text-primary" />
            <span>Desenvolvido por <strong className="font-semibold text-primary">Franc Denis</strong></span>
            <span className="text-foreground/40">·</span>
            <MapPin className="h-3 w-3 text-primary" />
            <span>Feijó / AC · © {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
