import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Database, 
  Cloud,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SessionDiagnosticCard() {
  const { user } = useAuth();
  const { agent, isLoading, error, refetch, _diagnosticInfo } = useAgentProfile() as any;
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionCheck, setSessionCheck] = useState<{
    hasSession: boolean;
    expiresAt?: string;
    checkedAt: string;
  } | null>(null);

  const handleRefreshDiagnostic = async () => {
    setIsRefreshing(true);
    try {
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      setSessionCheck({
        hasSession: !!session,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleTimeString('pt-BR') : undefined,
        checkedAt: new Date().toLocaleTimeString('pt-BR'),
      });

      // Refetch profile
      await refetch();
      
      toast.success('Diagnóstico atualizado');
    } catch (err) {
      console.error('Diagnostic refresh error:', err);
      toast.error('Erro ao atualizar diagnóstico');
    } finally {
      setIsRefreshing(false);
    }
  };

  const diagnosticInfo = _diagnosticInfo || {
    source: 'unknown',
    fetchedAt: null,
    attempts: 0,
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'edge-function':
        return { label: 'Backend Function', icon: Cloud, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' };
      case 'direct-id':
        return { label: 'Consulta por ID', icon: Database, color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' };
      case 'direct-cpf':
        return { label: 'Consulta por CPF', icon: Database, color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' };
      case 'direct-email':
        return { label: 'Consulta por Email', icon: Database, color: 'text-violet-400 bg-violet-500/20 border-violet-500/40' };
      case 'cached':
        return { label: 'Cache Local', icon: Clock, color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' };
      default:
        return { label: 'Desconhecido', icon: Activity, color: 'text-zinc-400 bg-zinc-500/20 border-zinc-500/40' };
    }
  };

  const sourceInfo = getSourceLabel(diagnosticInfo.source);
  const SourceIcon = sourceInfo.icon;

  return (
    <Card className="bg-zinc-900/90 border border-zinc-700/60 shadow-xl">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 rounded-md bg-violet-500/15 border border-violet-500/30">
              <Activity className="h-4 w-4 text-violet-400" />
            </div>
            <span className="font-semibold text-zinc-100">Diagnóstico de Sessão</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(!isVisible)}
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshDiagnostic}
              disabled={isRefreshing}
              className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isVisible && (
        <CardContent className="px-3 pb-3 space-y-3">
          {/* Session Status */}
          <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Status da Sessão</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  user ? "text-emerald-400 border-emerald-500/40" : "text-red-400 border-red-500/40"
                )}
              >
                {user ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Autenticado</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Não autenticado</>
                )}
              </Badge>
            </div>

            {sessionCheck && (
              <div className="text-[10px] text-zinc-500 space-y-0.5">
                <p>Verificado: {sessionCheck.checkedAt}</p>
                {sessionCheck.expiresAt && (
                  <p>Expira: {sessionCheck.expiresAt}</p>
                )}
              </div>
            )}
          </div>

          {/* Profile Status */}
          <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Perfil do Agente</span>
              {isLoading ? (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Carregando
                </Badge>
              ) : agent ? (
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Carregado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/40">
                  <XCircle className="h-3 w-3 mr-1" /> Não encontrado
                </Badge>
              )}
            </div>

            {error && (
              <p className="text-[10px] text-red-400 truncate">
                Erro: {error.message}
              </p>
            )}
          </div>

          {/* Source Info */}
          <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Fonte dos Dados</span>
              <Badge
                variant="outline"
                className={cn("text-[10px]", sourceInfo.color)}
              >
                <SourceIcon className="h-3 w-3 mr-1" />
                {sourceInfo.label}
              </Badge>
            </div>

            <div className="text-[10px] text-zinc-500 space-y-0.5">
              {diagnosticInfo.fetchedAt && (
                <p>Obtido: {new Date(diagnosticInfo.fetchedAt).toLocaleTimeString('pt-BR')}</p>
              )}
              {diagnosticInfo.attempts > 0 && (
                <p>Tentativas: {diagnosticInfo.attempts}</p>
              )}
            </div>
          </div>

          {/* Agent Summary (masked) */}
          {agent && (
            <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/40">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-zinc-300 font-medium">Resumo do Perfil</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="text-zinc-500">ID:</div>
                <div className="text-zinc-300 font-mono truncate">{agent.id.slice(0, 8)}...</div>
                
                <div className="text-zinc-500">Nome:</div>
                <div className="text-zinc-300 truncate">{agent.name?.split(' ')[0]}***</div>
                
                <div className="text-zinc-500">Equipe:</div>
                <div className="text-zinc-300">{agent.team || '-'}</div>
                
                <div className="text-zinc-500">Unidade:</div>
                <div className="text-zinc-300 truncate">{agent.unit?.name?.slice(0, 15) || '-'}...</div>
                
                <div className="text-zinc-500">Licença:</div>
                <div className={cn(
                  agent.license_status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                )}>
                  {agent.license_status || 'N/A'}
                </div>
              </div>
            </div>
          )}

          <p className="text-[9px] text-zinc-600 text-center">
            Dados mascarados para segurança. Use para suporte técnico.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
