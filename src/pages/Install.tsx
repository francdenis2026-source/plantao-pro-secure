import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  Share, 
  Plus, 
  CheckCircle2,
  Zap,
  Bell,
  Wifi,
  Shield,
  Clock,
  Users,
  ArrowLeft,
  PartyPopper
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Install() {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const handleInstall = async () => {
    if (isIOS) {
      // Scroll to instructions
      document.getElementById('ios-instructions')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const success = await promptInstall();
    if (success) {
      toast.success('App instalado com sucesso!', {
        description: 'O PlantãoPro foi adicionado à sua tela inicial.',
        icon: <PartyPopper className="h-5 w-5 text-amber-500" />,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Instalar PlantãoPro</h1>
            <p className="text-xs text-muted-foreground">Tenha acesso rápido e offline</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          {/* App Icon */}
          <div className="inline-flex p-1 rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
            <img 
              src="/icon-512.png" 
              alt="PlantãoPro" 
              className="w-24 h-24 rounded-2xl shadow-2xl shadow-amber-500/20"
            />
          </div>

          <div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
              PlantãoPro
            </h2>
            <p className="text-muted-foreground mt-2">
              Gestão completa de plantões e escalas
            </p>
          </div>

          {/* Status Badge */}
          {isInstalled ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              App Instalado
            </Badge>
          ) : (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-2">
              <Download className="h-4 w-4 mr-2" />
              Disponível para Instalação
            </Badge>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Acesso Rápido</p>
                <p className="text-xs text-muted-foreground">Direto da tela inicial</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Bell className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Notificações</p>
                <p className="text-xs text-muted-foreground">Alertas de plantões</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Wifi className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Modo Offline</p>
                <p className="text-xs text-muted-foreground">Funciona sem internet</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Seguro</p>
                <p className="text-xs text-muted-foreground">Dados protegidos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* App Features */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-lg">O que você pode fazer:</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Controle de plantões em tempo real</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Gerenciamento de equipe</span>
              </div>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Notificações de aniversários</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Banco de horas automatizado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Button */}
        {!isInstalled && (
          <div className="space-y-4">
            <Button
              onClick={handleInstall}
              disabled={!isInstallable && !isIOS}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg shadow-lg shadow-amber-500/30"
            >
              <Download className="h-5 w-5 mr-2" />
              {isIOS ? 'Como Instalar' : 'Instalar App'}
            </Button>

            {!isInstallable && !isIOS && (
              <p className="text-center text-sm text-muted-foreground">
                Abra este site no navegador Chrome para instalar o app
              </p>
            )}
          </div>
        )}

        {/* iOS Instructions */}
        {isIOS && !isInstalled && (
          <Card id="ios-instructions" className="bg-gradient-to-br from-slate-800 to-slate-800/50 border-amber-500/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-lg">Instruções para iPhone/iPad</h3>
              </div>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-black font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Toque no botão de Compartilhar
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Procure o ícone <Share className="h-4 w-4 inline-block mx-1" /> na barra inferior do Safari
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-black font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Role para baixo e toque em "Adicionar à Tela de Início"
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Procure a opção com o ícone <Plus className="h-4 w-4 inline-block mx-1" />
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Confirme tocando em "Adicionar"
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      O PlantãoPro aparecerá na sua tela inicial como um app nativo!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Installed Message */}
        {isInstalled && (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-5 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
              <div>
                <h3 className="font-bold text-lg text-green-400">App Instalado!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O PlantãoPro já está na sua tela inicial. Aproveite!
                </p>
              </div>
              <Button
                onClick={() => navigate('/agent-panel')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Abrir App
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Desenvolvido por <span className="text-amber-500">CS FEIJÓ</span>
        </p>
      </main>
    </div>
  );
}
