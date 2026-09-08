import { useNavigate } from 'react-router-dom';
import { Plus, CalendarOff, CalendarDays, MessageCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuickActionsCard() {
  const navigate = useNavigate();

  const links = [
    { label: 'Registrar indisponibilidade', icon: CalendarOff, href: '/agent-panel?tab=indisponibilidade' },
    { label: 'Ver minha escala', icon: CalendarDays, href: '/agenda' },
    { label: 'Abrir o chat da equipe', icon: MessageCircle, href: '/agent-panel?tab=chat' },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4">
      <Button className="w-full justify-center gap-1.5" onClick={() => navigate('/agent-panel?tab=permutas&new=1')}>
        <Plus className="h-4 w-4" /> Solicitar troca
      </Button>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        {links.map((l) => (
          <button
            key={l.label}
            onClick={() => navigate(l.href)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            <l.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{l.label}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          </button>
        ))}
      </div>
    </div>
  );
}
