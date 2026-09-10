import { useNavigate } from 'react-router-dom';
import { RoundsDashboard } from '@/features/rondas/components/RoundsDashboard';
import { BackButton } from '@/components/BackButton';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useRoundsRequireAuth } from '@/hooks/useRoundsRequireAuth';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';

function RoundsAccessRestricted() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 py-12 text-center">
      <BrasaoSentinela size={56} title="PlantãoPro" className="mb-5" />
      <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary ring-1 ring-primary/25">
        <ShieldCheck className="h-3 w-3" /> Acesso Restrito
      </p>
      <h1 className="mb-2 text-xl font-bold text-foreground md:text-2xl">
        O Gestor de Rondas exige login
      </h1>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Por decisão administrativa, esta ferramenta agora é exclusiva para agentes autenticados.
        Entre com sua matrícula para acompanhar e registrar rondas normalmente.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => navigate('/')} className="gap-1.5">
          <LogIn className="h-4 w-4" /> Entrar no sistema
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}

export default function RondasCommand() {
  const { user, masterSession, isLoading: authLoading } = useAuth();
  const { requireAuth, loading: settingLoading } = useRoundsRequireAuth();

  const isAuthed = !!user || !!masterSession;
  const checkingAccess = authLoading || settingLoading;
  const blocked = !checkingAccess && requireAuth && !isAuthed;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-lg font-bold text-foreground">Gestor de Rondas</h1>
            <p className="text-xs text-muted-foreground">Controle, acompanhamento e segurança em tempo real.</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {checkingAccess ? (
          <div className="flex min-h-[70dvh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : blocked ? (
          <RoundsAccessRestricted />
        ) : (
          <RoundsDashboard />
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}
