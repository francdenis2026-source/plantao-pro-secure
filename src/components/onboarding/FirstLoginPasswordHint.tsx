import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useWelcomeHintEnabled } from '@/hooks/useWelcomeHintEnabled';

const LS_KEY = 'pp:first-login-seen';

/**
 * Exibido no primeiro acesso do agente. Orienta a trocar a senha padrão (CPF).
 * Critério: `profiles.password_changed_at IS NULL` OU flag local ausente.
 */
export function FirstLoginPasswordHint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { enabled: welcomeHintEnabled, loading: welcomeHintLoading } = useWelcomeHintEnabled();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      if (welcomeHintLoading) return;
      // Admin toggle: hint only shows when explicitly enabled by the master admin.
      if (!welcomeHintEnabled) {
        setOpen(false);
        return;
      }
      if (localStorage.getItem(LS_KEY) === '1') return;

      const { data } = await supabase
        .from('profiles')
        .select('password_changed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      // Se nunca trocou a senha, exibe o aviso
      if (!data?.password_changed_at) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, welcomeHintEnabled, welcomeHintLoading]);

  const dismiss = () => {
    localStorage.setItem(LS_KEY, '1');
    setOpen(false);
  };

  const goChange = () => {
    dismiss();
    navigate('/settings#security');
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? dismiss() : setOpen(true))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Bem-vindo, agente
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            Sua <strong>senha padrão</strong> de acesso é o seu <strong>CPF</strong> (apenas números, sem
            pontos ou traços). Por segurança, <strong>troque-a imediatamente</strong> em
            Configurações → Segurança.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          Nunca compartilhe sua senha. O sistema nunca solicitará sua senha por telefone ou mensagem.
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={dismiss}>
            Depois
          </Button>
          <Button onClick={goChange} className="gap-2">
            <KeyRound className="h-4 w-4" /> Trocar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
