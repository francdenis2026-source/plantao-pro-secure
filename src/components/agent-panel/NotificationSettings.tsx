import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, BellRing, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function NotificationSettings() {
  const { permission, isSupported, isEnabled, requestPermission, showNotification } = usePushNotifications();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  const handleTestNotification = () => {
    showNotification({
      title: '🔔 Teste de Notificação',
      body: 'As notificações do Plantão Pro estão funcionando corretamente!',
      tag: 'test-notification',
      requireInteraction: false,
    });
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return (
        <Badge variant="outline" className="bg-slate-700/50 text-slate-400 border-slate-600">
          <XCircle className="h-3 w-3 mr-1" />
          Não Suportado
        </Badge>
      );
    }

    switch (permission) {
      case 'granted':
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ativado
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Bloqueado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-amber-500" />
            <span>Notificações Push</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">
          Receba alertas de plantão diretamente no seu navegador, mesmo quando não estiver com o aplicativo aberto.
        </p>

        {!isSupported ? (
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-400">
              Seu navegador não suporta notificações push. Tente usar um navegador mais recente como Chrome, Firefox ou Edge.
            </p>
          </div>
        ) : permission === 'denied' ? (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              As notificações foram bloqueadas. Para ativá-las, você precisa permitir notificações nas configurações do seu navegador.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Clique no ícone de cadeado na barra de endereço e permita notificações para este site.
            </p>
          </div>
        ) : !isEnabled ? (
          <div className="space-y-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400">
                Ative as notificações para receber lembretes 24h antes de cada plantão.
              </p>
            </div>
            <Button
              onClick={handleEnableNotifications}
              disabled={isRequesting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isRequesting ? (
                'Solicitando permissão...'
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Ativar Notificações
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
              <div>
                <p className="text-sm text-green-400 font-medium">Notificações ativadas!</p>
                <p className="text-xs text-slate-400 mt-1">
                  Você receberá alertas 24h antes de cada plantão.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-400" />
                  <Label htmlFor="shift-alerts" className="text-sm text-slate-300">
                    Lembretes de plantão
                  </Label>
                </div>
                <Switch id="shift-alerts" defaultChecked disabled className="data-[state=checked]:bg-amber-500" />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="w-full border-slate-600 hover:bg-slate-700"
            >
              <BellRing className="h-4 w-4 mr-2" />
              Testar Notificação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
