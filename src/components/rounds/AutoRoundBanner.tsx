import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Siren, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AutoSession {
  id: string;
  team: string;
  server_started_at: string;
  require_confirmation_to_stop: boolean;
  auto_started: boolean;
}

/**
 * Banner global exibido quando o agente logado tem uma round_session
 * ativa que foi iniciada automaticamente (auto_started=true) e exige
 * confirmação para encerrar. Impede fechamento silencioso.
 */
export function AutoRoundBanner() {
  const { agent } = useAgentProfile();
  const [session, setSession] = useState<AutoSession | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!agent?.id) { setSession(null); return; }

    const fetchActive = async () => {
      const { data } = await supabase
        .from('round_sessions')
        .select('id, team, server_started_at, require_confirmation_to_stop, auto_started')
        .eq('user_id', agent.id)
        .eq('is_active', true)
        .eq('auto_started', true)
        .order('server_started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSession((data as any) || null);
    };
    fetchActive();

    const ch = supabase
      .channel(`auto-round-${agent.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'round_sessions',
        filter: `user_id=eq.${agent.id}`,
      }, () => fetchActive())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [agent?.id]);

  if (!session) return null;

  const handleConfirmEnd = async () => {
    if (!password || password.length < 4) {
      toast({ title: 'Digite sua senha para confirmar', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Reautenticação leve: valida senha atual
      const email = `${agent?.cpf}@agent.plantaopro.com`;
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) {
        toast({ title: 'Senha incorreta', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const { error } = await supabase
        .from('round_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          stop_confirmed_by: agent?.id,
          stop_confirmed_at: new Date().toISOString(),
        })
        .eq('id', session.id);
      if (error) throw error;
      toast({ title: 'Ronda encerrada com confirmação' });
      setPassword('');
      setConfirmOpen(false);
      setSession(null);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const started = new Date(session.server_started_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Rio_Branco' });

  return (
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-red-900/90 via-red-800/90 to-red-900/90 border-b border-red-500/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center gap-3">
          <div className="relative">
            <Siren className="h-5 w-5 text-red-300 animate-pulse" />
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-red-200">RONDA EM ANDAMENTO</div>
            <div className="text-xs text-red-100/90 truncate">
              Iniciada automaticamente às {started} · Equipe {session.team} · Encerramento requer confirmação
            </div>
          </div>
          {session.require_confirmation_to_stop && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-300/60 bg-red-500/20 text-red-100 hover:bg-red-500/30"
              onClick={() => setConfirmOpen(true)}
            >
              <ShieldCheck className="h-4 w-4 mr-1" /> Confirmar encerramento
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent className="bg-slate-900 border-red-500/40 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar encerramento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-300">
            <p>Esta ronda foi iniciada automaticamente pelo sistema. Para encerrá-la é necessário confirmar sua identidade digitando a senha.</p>
            <div>
              <Label>Senha (6 dígitos)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="new-password"
                inputMode="numeric"
                maxLength={6}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmEnd}
              disabled={submitting}
            >
              {submitting ? 'Validando...' : 'Encerrar ronda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AutoRoundBanner;
