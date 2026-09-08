import { useEffect, useState } from 'react';
import { Megaphone, AlertTriangle, Info, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Announcement = {
  id: string;
  title: string;
  content: string | null;
  priority: string;
  created_at: string;
};

const PRIORITY = {
  critical: { label: 'CRÍTICO', ring: 'ring-red-500/50', dot: 'bg-red-500', text: 'text-red-400', Icon: AlertTriangle },
  urgent: { label: 'URGENTE', ring: 'ring-amber-500/50', dot: 'bg-amber-500', text: 'text-amber-400', Icon: Radio },
  normal: { label: 'ROTINA', ring: 'ring-primary/40', dot: 'bg-primary', text: 'text-primary', Icon: Info },
} as const;

/**
 * Mural de Comunicados Rápidos — read-only carousel with the latest
 * 3 active admin announcements. Rotates every 6s. Falls back to a
 * silent status pill when nothing is active.
 */
export function AnnouncementsMural({ className }: { className?: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('admin_announcements')
        .select('id,title,content,priority,created_at')
        .eq('is_active', true)
        .lte('starts_at', nowIso)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(3);
      if (cancelled) return;
      setItems((data as Announcement[]) ?? []);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel('mural_announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_announcements' },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const current = items[idx];
  const meta = (current && (PRIORITY as any)[current.priority]) || PRIORITY.normal;
  const Icon = meta.Icon;

  return (
    <section
      aria-label="Mural de comunicados rápidos"
      className={cn(
        'relative overflow-hidden rounded-md border border-primary/20 bg-[linear-gradient(180deg,hsl(220_35%_6%/0.92)_0%,hsl(222_40%_4%/0.98)_100%)] backdrop-blur-md',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary))_50%,transparent)] opacity-70"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <Megaphone className="h-3.5 w-3.5 text-primary" />
          <span className="text-[9px] uppercase tracking-[0.24em] font-mono font-semibold text-primary/80 hidden sm:inline">
            Mural
          </span>
        </div>
        <span aria-hidden className="hidden sm:block h-3.5 w-px bg-border/60" />

        {loading ? (
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            sincronizando…
          </span>
        ) : !current ? (
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-success opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Sem ocorrências · Canal em rotina
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 flex-1 animate-fade-in" key={current.id}>
            <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-sm ring-1 text-[8.5px] font-bold tracking-[0.18em] uppercase font-mono shrink-0', meta.ring, meta.text)}>
              <Icon className="h-2.5 w-2.5" />
              {meta.label}
            </span>
            <div className="min-w-0 flex-1 flex items-baseline gap-2">
              <span className="text-[11px] font-semibold text-foreground truncate">{current.title}</span>
              {current.content && (
                <span className="text-[10px] text-muted-foreground/80 truncate hidden md:inline">
                  — {current.content}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono text-muted-foreground/60 shrink-0 hidden sm:inline">
              {new Date(current.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {items.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            {items.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all',
                  i === idx ? 'w-4 bg-primary' : 'w-1 bg-border',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
