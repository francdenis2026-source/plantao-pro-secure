import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface DiagnosticData {
  timestamp: string;
  environment: {
    userAgent: string;
    language: string;
    online: boolean;
    cookiesEnabled: boolean;
    platform: string;
    screenSize: string;
    timezone: string;
  };
  auth: {
    hasUser: boolean;
    userId?: string;
    email?: string;
    hasSession: boolean;
    expiresAt?: string;
    tokenPresent: boolean;
    isLoading: boolean;
  };
  connection: {
    isOnline: boolean;
    isRetrying: boolean;
    retryCount: number;
    lastError: string | null;
  };
  serviceWorker: {
    supported: boolean;
    controllerActive: boolean;
    registrations: number;
  };
  storage: {
    localStorageAvailable: boolean;
    sessionStorageAvailable: boolean;
    cacheStorageAvailable: boolean;
    localStorageKeys: string[];
  };
  recentErrors: string[];
}

export function DiagnosticReportButton() {
  const { user, session, isLoading } = useAuth();
  const { isOnline, isRetrying, retryCount, lastError } = useSessionPersistence();
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateReport = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Collect service worker info
      let swInfo = {
        supported: 'serviceWorker' in navigator,
        controllerActive: false,
        registrations: 0,
      };

      if ('serviceWorker' in navigator) {
        swInfo.controllerActive = !!navigator.serviceWorker.controller;
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          swInfo.registrations = regs.length;
        } catch {
          // ignore
        }
      }

      // Collect localStorage keys (without values for privacy)
      const localStorageKeys: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) localStorageKeys.push(key);
        }
      } catch {
        // ignore
      }

      // Collect recent console errors (if stored)
      const recentErrors: string[] = [];
      try {
        const storedErrors = sessionStorage.getItem('plantaopro_console_errors');
        if (storedErrors) {
          recentErrors.push(...JSON.parse(storedErrors).slice(-10));
        }
      } catch {
        // ignore
      }

      // Get fresh session data
      const { data: { session: freshSession } } = await supabase.auth.getSession();

      const diagnosticData: DiagnosticData = {
        timestamp: new Date().toISOString(),
        environment: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          online: navigator.onLine,
          cookiesEnabled: navigator.cookieEnabled,
          platform: navigator.platform,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        auth: {
          hasUser: !!user,
          userId: user?.id,
          email: user?.email,
          hasSession: !!freshSession,
          expiresAt: freshSession?.expires_at 
            ? new Date(freshSession.expires_at * 1000).toISOString() 
            : undefined,
          tokenPresent: !!freshSession?.access_token,
          isLoading,
        },
        connection: {
          isOnline,
          isRetrying,
          retryCount,
          lastError,
        },
        serviceWorker: swInfo,
        storage: {
          localStorageAvailable: typeof localStorage !== 'undefined',
          sessionStorageAvailable: typeof sessionStorage !== 'undefined',
          cacheStorageAvailable: 'caches' in window,
          localStorageKeys,
        },
        recentErrors,
      };

      // Format as readable text
      const reportText = `
═══════════════════════════════════════════════════════════════
              PLANTÃO PRO - RELATÓRIO DE DIAGNÓSTICO
═══════════════════════════════════════════════════════════════

📅 Data/Hora: ${diagnosticData.timestamp}

───────────────────────────────────────────────────────────────
🌐 AMBIENTE
───────────────────────────────────────────────────────────────
• User Agent: ${diagnosticData.environment.userAgent}
• Idioma: ${diagnosticData.environment.language}
• Plataforma: ${diagnosticData.environment.platform}
• Tela: ${diagnosticData.environment.screenSize}
• Fuso Horário: ${diagnosticData.environment.timezone}
• Online: ${diagnosticData.environment.online ? '✅ Sim' : '❌ Não'}
• Cookies: ${diagnosticData.environment.cookiesEnabled ? '✅ Habilitados' : '❌ Desabilitados'}

───────────────────────────────────────────────────────────────
🔐 AUTENTICAÇÃO
───────────────────────────────────────────────────────────────
• Usuário: ${diagnosticData.auth.hasUser ? '✅ Presente' : '❌ Ausente'}
• User ID: ${diagnosticData.auth.userId || '—'}
• Email: ${diagnosticData.auth.email || '—'}
• Sessão: ${diagnosticData.auth.hasSession ? '✅ Ativa' : '❌ Inativa'}
• Token: ${diagnosticData.auth.tokenPresent ? '✅ Presente' : '❌ Ausente'}
• Expira em: ${diagnosticData.auth.expiresAt || '—'}
• Carregando: ${diagnosticData.auth.isLoading ? '⏳ Sim' : '✅ Não'}

───────────────────────────────────────────────────────────────
📡 CONEXÃO
───────────────────────────────────────────────────────────────
• Status: ${diagnosticData.connection.isOnline ? '✅ Online' : '❌ Offline'}
• Reconectando: ${diagnosticData.connection.isRetrying ? `⏳ Sim (tentativa ${diagnosticData.connection.retryCount})` : '✅ Não'}
• Último Erro: ${diagnosticData.connection.lastError || '—'}

───────────────────────────────────────────────────────────────
⚙️ SERVICE WORKER
───────────────────────────────────────────────────────────────
• Suportado: ${diagnosticData.serviceWorker.supported ? '✅ Sim' : '❌ Não'}
• Controller Ativo: ${diagnosticData.serviceWorker.controllerActive ? '✅ Sim' : '❌ Não'}
• Registros: ${diagnosticData.serviceWorker.registrations}

───────────────────────────────────────────────────────────────
💾 ARMAZENAMENTO
───────────────────────────────────────────────────────────────
• LocalStorage: ${diagnosticData.storage.localStorageAvailable ? '✅ Disponível' : '❌ Indisponível'}
• SessionStorage: ${diagnosticData.storage.sessionStorageAvailable ? '✅ Disponível' : '❌ Indisponível'}
• CacheStorage: ${diagnosticData.storage.cacheStorageAvailable ? '✅ Disponível' : '❌ Indisponível'}
• Chaves localStorage: ${diagnosticData.storage.localStorageKeys.length}
  ${diagnosticData.storage.localStorageKeys.slice(0, 20).join('\n  ')}
  ${diagnosticData.storage.localStorageKeys.length > 20 ? `  ... e mais ${diagnosticData.storage.localStorageKeys.length - 20}` : ''}

───────────────────────────────────────────────────────────────
⚠️ ERROS RECENTES
───────────────────────────────────────────────────────────────
${diagnosticData.recentErrors.length > 0 
  ? diagnosticData.recentErrors.map(e => `• ${e}`).join('\n')
  : '• Nenhum erro registrado'}

═══════════════════════════════════════════════════════════════
                    FIM DO RELATÓRIO
═══════════════════════════════════════════════════════════════
`.trim();

      setReport(reportText);
    } catch (error) {
      console.error('Error generating diagnostic report:', error);
      setReport('Erro ao gerar relatório: ' + String(error));
    }

    setIsGenerating(false);
  }, [user, session, isLoading, isOnline, isRetrying, retryCount, lastError]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Relatório copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o relatório.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-plantaopro-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Download iniciado',
      description: 'O relatório está sendo baixado.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(true);
            generateReport();
          }}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Diagnóstico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Diagnóstico
          </DialogTitle>
          <DialogDescription>
            Use este relatório para enviar ao suporte técnico em caso de problemas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Gerando relatório...</span>
            </div>
          ) : (
            <>
              <Textarea
                value={report}
                readOnly
                className="font-mono text-xs h-[300px] resize-none"
              />
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                <Button
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
