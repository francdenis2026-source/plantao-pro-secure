import { useState, useEffect, useMemo } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Download,
  X,
  Smartphone,
  Monitor,
  Share,
  Plus,
  CheckCircle2,
  Zap,
  Bell,
  Wifi,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';

type Platform = 'ios' | 'android' | 'desktop-chromium' | 'desktop-firefox' | 'desktop-safari' | 'desktop-other';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop-other';
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) && /webkit/.test(ua) && !/crios/.test(ua);
  if (isIOS) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/edg\//.test(ua) || /chrome\//.test(ua)) return 'desktop-chromium';
  if (/firefox\//.test(ua)) return 'desktop-firefox';
  if (/safari\//.test(ua)) return 'desktop-safari';
  return 'desktop-other';
}

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismissInstallPrompt } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const platform = useMemo(detectPlatform, []);
  const isDesktop = platform.startsWith('desktop');

  useEffect(() => {
    if (isInstalled) {
      setShowBanner(false);
      return;
    }

    // Skip if user dismissed within last 7 days
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Chromium desktop/android fires beforeinstallprompt -> isInstallable
    // iOS/Firefox/Safari desktop don't fire it but we still guide the user
    const shouldShow =
      isInstallable ||
      isIOS ||
      platform === 'desktop-firefox' ||
      platform === 'desktop-safari';

    if (shouldShow) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isIOS, isInstalled, platform]);

  const handleInstall = async () => {
    // Native prompt available (Chromium desktop + Android)
    if (isInstallable) {
      const success = await promptInstall();
      if (success) {
        toast.success('App instalado com sucesso!', {
          description: isDesktop
            ? 'O PlantãoPro foi adicionado ao seu computador.'
            : 'O PlantãoPro foi adicionado à sua tela inicial.',
        });
        setShowBanner(false);
      }
      return;
    }

    // Fallback: show manual instructions for iOS / Firefox / Safari desktop
    setShowManualDialog(true);
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setShowBanner(false);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Install Banner — responsive: bottom sheet on mobile, floating card on desktop */}
      <div
        className={
          isDesktop
            ? 'fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] animate-fade-in'
            : 'fixed bottom-4 left-4 right-4 z-50 animate-fade-in'
        }
      >
        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border-amber-500/40 shadow-2xl shadow-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                {isDesktop ? (
                  <Monitor className="h-6 w-6 text-black" />
                ) : (
                  <Smartphone className="h-6 w-6 text-black" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-base leading-tight">
                  {isDesktop ? 'Instalar no seu computador' : 'Instalar PlantãoPro'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isDesktop
                    ? 'Abra como aplicativo, sem barra de navegador.'
                    : 'Adicione à tela inicial para acesso rápido.'}
                </p>

                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                    <Zap className="h-3 w-3" /> Mais rápido
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-green-400">
                    <Bell className="h-3 w-3" /> Notificações
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-blue-400">
                    <Wifi className="h-3 w-3" /> Offline
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
                aria-label="Dispensar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handleInstall}
              className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold h-9"
            >
              <Download className="h-4 w-4 mr-2" />
              {isInstallable ? 'Instalar agora' : 'Como instalar'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Manual instructions dialog (iOS / Firefox / Safari desktop) */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isDesktop ? (
                <Monitor className="h-5 w-5 text-amber-500" />
              ) : (
                <Smartphone className="h-5 w-5 text-amber-500" />
              )}
              {platform === 'ios' && 'Instalar no iPhone/iPad'}
              {platform === 'desktop-firefox' && 'Instalar no Firefox'}
              {platform === 'desktop-safari' && 'Instalar no Safari (macOS)'}
              {platform === 'desktop-other' && 'Instalar no computador'}
              {platform === 'desktop-chromium' && 'Instalar no computador'}
              {platform === 'android' && 'Instalar no Android'}
            </DialogTitle>
            <DialogDescription>Siga os passos abaixo para instalar o app.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {platform === 'ios' && (
              <>
                <Step n={1} title="Toque no botão Compartilhar">
                  Procure o ícone <Share className="h-3 w-3 inline-block mx-1" /> na barra do Safari.
                </Step>
                <Step n={2} title='Toque em "Adicionar à Tela de Início"'>
                  Procure a opção com o ícone <Plus className="h-3 w-3 inline-block mx-1" />.
                </Step>
                <Step n={3} title='Confirme em "Adicionar"' done>
                  O app aparecerá na sua tela inicial.
                </Step>
              </>
            )}

            {platform === 'desktop-safari' && (
              <>
                <Step n={1} title="Abra o menu Arquivo">
                  Na barra do macOS, clique em <strong>Arquivo</strong>.
                </Step>
                <Step n={2} title='Escolha "Adicionar ao Dock"'>
                  O Safari 17+ instala o site como app do macOS.
                </Step>
                <Step n={3} title="Abra pelo Launchpad" done>
                  O ícone do PlantãoPro aparecerá no Dock e no Launchpad.
                </Step>
              </>
            )}

            {platform === 'desktop-firefox' && (
              <>
                <Step n={1} title="Firefox no computador não instala PWAs">
                  Para instalar como aplicativo, use <strong>Google Chrome</strong>,{' '}
                  <strong>Microsoft Edge</strong> ou <strong>Brave</strong>.
                </Step>
                <Step n={2} title="Abra este mesmo endereço em um navegador compatível">
                  Depois clique novamente em <em>Instalar agora</em>.
                </Step>
                <Step n={3} title="Alternativa: fixar aba" done>
                  Clique com o botão direito na aba → <strong>Fixar aba</strong>.
                </Step>
              </>
            )}

            {(platform === 'desktop-other' || platform === 'desktop-chromium') && (
              <>
                <Step n={1} title="Abra o menu do navegador">
                  Clique nos três pontos <MoreVertical className="h-3 w-3 inline-block mx-1" /> no
                  canto superior direito.
                </Step>
                <Step n={2} title='Escolha "Instalar PlantãoPro"'>
                  Ou <strong>Aplicativos → Instalar este site como aplicativo</strong>.
                </Step>
                <Step n={3} title="Confirme a instalação" done>
                  O app abrirá em janela própria e ficará no menu Iniciar / Launchpad.
                </Step>
              </>
            )}

            <Button
              onClick={() => setShowManualDialog(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({
  n,
  title,
  children,
  done,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800/70 rounded-lg border border-slate-700/60">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          done ? 'bg-green-500/20' : 'bg-amber-500/20'
        }`}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <span className="text-amber-400 font-bold text-sm">{n}</span>
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{children}</p>
      </div>
    </div>
  );
}
