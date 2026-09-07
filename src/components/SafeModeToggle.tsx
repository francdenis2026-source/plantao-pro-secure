import { useState, useEffect } from 'react';
import { useSafeMode } from '@/hooks/useSafeMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldAlert, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SafeModeToggleProps {
  variant?: 'full' | 'compact' | 'switch';
}

export function SafeModeToggle({ variant = 'full' }: SafeModeToggleProps) {
  const { 
    isSafeMode, 
    enableSafeMode, 
    disableSafeMode, 
    getTimeRemaining 
  } = useSafeMode({
    duration: 30 * 60 * 1000, // 30 minutes
    onEnable: () => {
      toast({
        title: 'Modo Seguro Ativado',
        description: 'Service Worker e cache offline foram desabilitados temporariamente.',
      });
    },
    onDisable: () => {
      toast({
        title: 'Modo Seguro Desativado',
        description: 'Funcionalidades offline foram restauradas.',
      });
    },
  });

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isSafeMode) {
      setTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [isSafeMode, getTimeRemaining]);

  const formatTime = (ms: number | null) => {
    if (ms === null) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (variant === 'switch') {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isSafeMode ? (
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          )}
          <Label htmlFor="safe-mode" className="text-sm">
            Modo Seguro
          </Label>
          {isSafeMode && timeRemaining !== null && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(timeRemaining)}
            </Badge>
          )}
        </div>
        
        {isSafeMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={disableSafeMode}
            className="text-xs"
          >
            Desativar
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Switch id="safe-mode" checked={false} />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  Ativar Modo Seguro?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    O Modo Seguro desativa temporariamente o Service Worker e o cache offline.
                    Isso pode ajudar a resolver problemas de autenticação ou sincronização.
                  </p>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-500">Atenção:</p>
                        <ul className="text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                          <li>A página será recarregada</li>
                          <li>Funcionalidades offline serão desabilitadas</li>
                          <li>O modo seguro expira automaticamente em 30 minutos</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={enableSafeMode}
                  className="bg-amber-500 text-black hover:bg-amber-400"
                >
                  Ativar Modo Seguro
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={isSafeMode ? 'default' : 'outline'}
            size="sm"
            className={isSafeMode ? 'bg-amber-500 text-black hover:bg-amber-400' : ''}
          >
            {isSafeMode ? (
              <>
                <ShieldAlert className="h-4 w-4 mr-1" />
                Modo Seguro ({formatTime(timeRemaining)})
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-1" />
                Modo Normal
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSafeMode ? 'Desativar Modo Seguro?' : 'Ativar Modo Seguro?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSafeMode 
                ? 'Isso reativará o Service Worker e as funcionalidades offline.'
                : 'Isso desabilitará temporariamente o Service Worker e o cache offline para resolver problemas de conexão.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={isSafeMode ? disableSafeMode : enableSafeMode}
            >
              {isSafeMode ? 'Desativar' : 'Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Full variant
  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSafeMode ? (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          )}
          <div>
            <h3 className="font-medium">
              {isSafeMode ? 'Modo Seguro Ativo' : 'Modo Normal'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isSafeMode 
                ? 'Service Worker e cache desabilitados'
                : 'Todas as funcionalidades ativas'
              }
            </p>
          </div>
        </div>

        {isSafeMode && timeRemaining !== null && (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(timeRemaining)}
          </Badge>
        )}
      </div>

      {isSafeMode ? (
        <Button
          variant="outline"
          onClick={disableSafeMode}
          className="w-full"
        >
          Desativar Modo Seguro
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <ShieldAlert className="h-4 w-4 mr-2" />
              Ativar Modo Seguro
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Ativar Modo Seguro?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  O Modo Seguro é útil quando você está enfrentando problemas de 
                  autenticação, sincronização ou quedas de sessão frequentes.
                </p>
                <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium">O que acontece:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Service Worker será desregistrado</li>
                    <li>• Cache offline será limpo</li>
                    <li>• A página será recarregada</li>
                    <li>• Funcionalidades offline ficarão indisponíveis</li>
                    <li>• Expira automaticamente em 30 minutos</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={enableSafeMode}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                Ativar Modo Seguro
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
