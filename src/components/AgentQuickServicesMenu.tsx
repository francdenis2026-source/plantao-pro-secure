import { Menu, ExternalLink, Phone, ScrollText, ShieldCheck, Building2, CalendarClock, ArrowLeftRight, MessageCircle, Settings, LogIn, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ServiceLink {
  label: string;
  description: string;
  icon: typeof ScrollText;
  external?: boolean;
  href: string;
  /** Exige agente cadastrado — visitante é levado pra identificação por
   * matrícula em vez de navegar direto (Seção 43). */
  requiresAuth?: boolean;
}

const LEGISLACAO: ServiceLink[] = [
  {
    label: 'Estatuto da Criança e do Adolescente (ECA)',
    description: 'Lei 8.069/1990 — texto completo',
    icon: ScrollText,
    external: true,
    href: 'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm',
  },
  {
    label: 'SINASE',
    description: 'Lei 12.594/2012 — Sistema Nacional de Atendimento Socioeducativo',
    icon: ScrollText,
    external: true,
    href: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12594.htm',
  },
  {
    label: 'ISE/AC — Instituto Socioeducativo do Acre',
    description: 'Portal institucional oficial',
    icon: Building2,
    external: true,
    href: 'https://ise.ac.gov.br/',
  },
];

const EMERGENCIA: ServiceLink[] = [
  { label: 'Polícia Militar', description: '190', icon: Phone, href: 'tel:190' },
  { label: 'SAMU', description: '192', icon: Phone, href: 'tel:192' },
  { label: 'Corpo de Bombeiros', description: '193', icon: Phone, href: 'tel:193' },
  { label: 'Disque Direitos Humanos', description: '100', icon: Phone, href: 'tel:100' },
  { label: 'Centro de Valorização da Vida (CVV)', description: '188 — apoio emocional', icon: Phone, href: 'tel:188' },
];

/**
 * Menu hambúrguer de serviços úteis para o agente socioeducativo — atalhos
 * do próprio app, legislação de referência (ECA/SINASE) e contatos de
 * emergência. Disponível globalmente (renderizado uma vez no App).
 */
export function AgentQuickServicesMenu({ className, variant = 'floating' }: { className?: string; variant?: 'floating' | 'header' }) {
  const navigate = useNavigate();
  const { user, masterSession } = useAuth();
  const isAuthed = !!user || !!masterSession;

  // Mesmo cardápio de funções pra todo mundo — visitante vê tudo que existe
  // no PlantãoPro, só que o que exige cadastro leva pra identificação por
  // matrícula em vez de abrir direto (Seção 43).
  const appAtalhos: ServiceLink[] = [
    { label: 'Gestor de Rondas', description: 'Rondas em andamento', icon: ShieldCheck, href: '/rondas' },
    { label: 'Minha escala', description: 'Próximos plantões', icon: CalendarClock, href: '/agenda', requiresAuth: true },
    { label: 'Permutas', description: 'Solicitar ou aceitar trocas', icon: ArrowLeftRight, href: '/agent-panel?tab=permutas', requiresAuth: true },
    { label: 'Banco de Horas', description: 'Saldo e lançamentos', icon: Clock, href: '/overtime', requiresAuth: true },
    { label: 'Chat da equipe', description: 'Falar com sua equipe', icon: MessageCircle, href: '/agent-panel?tab=chat', requiresAuth: true },
    { label: 'Configurações', description: 'Preferências da conta', icon: Settings, href: '/settings', requiresAuth: true },
    ...(!isAuthed ? [{ label: 'Entrar no sistema', description: 'Acessar com matrícula e senha', icon: LogIn, href: '/', requiresAuth: false }] : []),
  ];

  const renderRow = (item: ServiceLink) => {
    const locked = item.requiresAuth && !isAuthed;
    const content = (
      <div className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-muted">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', locked ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
          <item.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
        </div>
        {item.external && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
      </div>
    );

    if (item.external || item.href.startsWith('tel:')) {
      return (
        <a key={item.label} href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined}>
          {content}
        </a>
      );
    }
    return (
      <SheetClose asChild key={item.label}>
        <button
          type="button"
          className="w-full"
          onClick={() => navigate(locked ? `/?login=1&feature=${encodeURIComponent(item.label)}` : item.href)}
        >
          {content}
        </button>
      </SheetClose>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir ferramentas do operador"
          title="Ferramentas do operador"
          className={cn(
            variant === 'header'
              ? 'flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted'
              : 'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted',
            className,
          )}
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle>Ferramentas do Operador</SheetTitle>
          <SheetDescription>Atalhos úteis para o dia a dia do agente de segurança pública</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-3 py-4">
          <section>
            <h3 className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">No PlantãoPro</h3>
            <div className="space-y-0.5">{appAtalhos.map(renderRow)}</div>
          </section>

          <section>
            <h3 className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Legislação e referência</h3>
            <div className="space-y-0.5">{LEGISLACAO.map(renderRow)}</div>
          </section>

          <section>
            <h3 className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Emergência</h3>
            <div className="space-y-0.5">{EMERGENCIA.map(renderRow)}</div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
