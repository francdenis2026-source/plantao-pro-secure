import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { ConnectedDevicesCard } from '@/components/settings/ConnectedDevicesCard';

/* ─── Inline SVG icons (uniforme, sem lucide) ─── */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconBack = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M15 18l-6-6 6-6" /></svg>
);
const IconSettings = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.13 16.9l.06-.06A1.7 1.7 0 0 0 4.53 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.85 1.7 1.7 0 0 0 4.31 7l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.35.61.99.99 1.7 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
  </svg>
);
const IconPalette = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}>
    <circle cx="13.5" cy="6.5" r="1.2" />
    <circle cx="17.5" cy="10.5" r="1.2" />
    <circle cx="8.5" cy="7.5" r="1.2" />
    <circle cx="6.5" cy="12.5" r="1.2" />
    <path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 1.8-4.24A2.5 2.5 0 0 1 15.6 13.5H18a4 4 0 0 0 4-4 8 8 0 0 0-10-7.5" />
  </svg>
);
const IconShield = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}><path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" /></svg>
);
const IconKey = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...stroke} {...p}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.5 12.5 21 2M17 6l3 3M15 8l2 2" />
  </svg>
);
const IconLoader = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...stroke} className={`animate-spin ${p.className ?? ''}`}><path d="M21 12a9 9 0 1 1-3-6.7" /></svg>
);

export default function Settings() {
  const { user, isLoading, userRole, masterSession } = useAuth();
  const navigate = useNavigate();
  const { themeConfig } = useTheme();

  const { goBack } = useBackNavigation({ enabled: true, fallbackPath: '/dashboard' });

  useEffect(() => {
    if (isLoading) return;
    if (user || masterSession) return;
    if (!navigator.onLine) return;
    const timer = setTimeout(() => {
      if (!navigator.onLine) return;
      navigate('/', { replace: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [user, isLoading, masterSession, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <IconLoader className="h-7 w-7 text-primary" />
      </div>
    );
  }

  if (!user && !masterSession) return null;

  const roleLabel =
    masterSession && !userRole ? 'Master' :
    userRole === 'master' ? 'Master' :
    userRole === 'admin' ? 'Administrador' : 'Usuário';
  const isPrivileged = userRole === 'master' || userRole === 'admin' || !!masterSession;

  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Back */}
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="gap-1.5 h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Voltar"
            >
              <IconBack className="h-4 w-4" />
              Voltar
            </Button>

            {/* Header */}
            <header className="border-b border-border/40 pb-3">
              <h1 className="font-tactical text-lg font-bold tracking-[0.14em] flex items-center gap-2 text-foreground">
                <IconSettings className="h-5 w-5 text-primary" />
                Configurações
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Preferências da conta e do sistema.
              </p>
            </header>

            {/* Tema */}
            <Card className="glass glass-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <IconPalette className="h-4 w-4 text-primary" />
                  Tema visual
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">Tema atual</span>
                  <span className="font-medium text-primary tabular-nums">
                    {themeConfig.emoji} {themeConfig.name}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/70 mt-2 leading-snug">
                  Definido pelo administrador no painel administrativo.
                </p>
              </CardContent>
            </Card>

            {/* Dispositivos conectados */}
            {user && <ConnectedDevicesCard />}

            {/* Senha */}
            {user && (
              <Card className="glass glass-border">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <IconKey className="h-4 w-4 text-primary" />
                    Segurança da conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">Senha</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Mantenha o acesso protegido com uma senha forte.
                      </p>
                    </div>
                    <ChangePasswordDialog />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Permissões — compacto */}
            <Card className="glass glass-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <IconShield className="h-4 w-4 text-primary" />
                  Permissões
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs text-muted-foreground">Função</Label>
                  <Badge
                    variant={isPrivileged ? 'default' : 'secondary'}
                    className="text-[11px] font-mono tracking-wide"
                  >
                    {roleLabel}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                  {isPrivileged
                    ? 'Acesso total: gestão de agentes, escalas e banco de horas.'
                    : 'Acesso de visualização às escalas e informações operacionais.'}
                </p>
              </CardContent>
            </Card>

            {/* Rodapé */}
            <footer className="text-center pt-3 border-t border-border/30">
              <p className="text-[11px] text-muted-foreground">
                Desenvolvido por <span className="text-primary font-semibold">CS FEIJÓ</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Feijó, Acre · © {new Date().getFullYear()} PlantãoPro
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
