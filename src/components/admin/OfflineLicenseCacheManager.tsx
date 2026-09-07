import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useOfflineLicenseCache, type OfflineLicense } from '@/hooks/useOfflineLicenseCache';
import { 
  HardDrive, 
  Loader2, 
  RefreshCw, 
  Download,
  Trash2,
  Check,
  X,
  Clock,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentForCache {
  id: string;
  cpf: string;
  name: string;
  team: string | null;
  unit_id: string | null;
  license_status: string | null;
  license_expires_at: string | null;
  is_active: boolean;
}

export function OfflineLicenseCacheManager() {
  const [agents, setAgents] = useState<AgentForCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { 
    licenses, 
    lastSync, 
    updateLicenses, 
    clearCache, 
    isLicenseValid 
  } = useOfflineLicenseCache();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('id, cpf, name, team, unit_id, license_status, license_expires_at, is_active')
        .eq('is_active', true)
        .not('cpf', 'is', null)
        .order('name');

      if (error) throw error;
      setAgents((data as AgentForCache[]) || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agentes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const syncToLocalCache = async () => {
    try {
      setSyncing(true);

      // Fetch fresh data
      await fetchAgents();

      // Convert to offline format
      const offlineLicenses: OfflineLicense[] = agents.map(agent => ({
        agentId: agent.id,
        cpf: agent.cpf,
        name: agent.name,
        team: agent.team,
        unitId: agent.unit_id,
        licenseStatus: agent.license_status || 'active',
        licenseExpiresAt: agent.license_expires_at,
        cachedAt: new Date().toISOString(),
      }));

      updateLicenses(offlineLicenses);

      // Also sync to database cache table
      const { error } = await supabase.rpc('sync_offline_license_cache');
      if (error) {
        console.warn('Database sync warning:', error);
      }

      toast({
        title: 'Cache sincronizado',
        description: `${offlineLicenses.length} licenças salvas para uso offline.`,
      });
    } catch (error) {
      console.error('Error syncing cache:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar o cache.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = () => {
    if (!confirm('Deseja limpar todo o cache offline? Os dados serão perdidos.')) return;
    
    clearCache();
    toast({
      title: 'Cache limpo',
      description: 'Todos os dados offline foram removidos.',
    });
  };

  const exportCache = () => {
    const data = {
      licenses,
      lastSync,
      exportedAt: new Date().toISOString(),
      version: 1,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantaopro-licenses-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportado',
      description: 'Arquivo de cache baixado com sucesso.',
    });
  };

  const validCount = licenses.filter(l => isLicenseValid(l)).length;
  const invalidCount = licenses.length - validCount;
  const progressValue = licenses.length > 0 ? (validCount / licenses.length) * 100 : 0;

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <HardDrive className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-white">Cache Offline de Licenças</CardTitle>
              <CardDescription>
                Banco de dados local para autenticação sem internet
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCache} disabled={licenses.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearCache} disabled={licenses.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={syncToLocalCache} disabled={syncing}>
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Users className="h-4 w-4" />
              Total em Cache
            </div>
            <p className="text-2xl font-bold text-white mt-1">{licenses.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <Check className="h-4 w-4" />
              Válidas
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{validCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <X className="h-4 w-4" />
              Expiradas
            </div>
            <p className="text-2xl font-bold text-red-400 mt-1">{invalidCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Clock className="h-4 w-4" />
              Última Sync
            </div>
            <p className="text-sm font-medium text-white mt-1">
              {lastSync 
                ? formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })
                : 'Nunca'
              }
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {licenses.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Licenças válidas</span>
              <span className="text-slate-300">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
        )}

        {/* Connection status */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          {navigator.onLine ? (
            <>
              <Wifi className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Online - Sincronização disponível</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-400">Offline - Usando cache local</span>
            </>
          )}
        </div>

        {/* License table */}
        {licenses.length > 0 ? (
          <ScrollArea className="h-[300px] rounded-lg border border-slate-700/50">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Nome</TableHead>
                  <TableHead className="text-slate-400">CPF</TableHead>
                  <TableHead className="text-slate-400">Equipe</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Expira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => {
                  const valid = isLicenseValid(license);
                  return (
                    <TableRow key={license.agentId} className="border-slate-700/50">
                      <TableCell className="text-white font-medium">
                        {license.name}
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-sm">
                        {license.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {license.team || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={valid ? 'default' : 'destructive'}
                          className={valid ? 'bg-emerald-500/20 text-emerald-400' : ''}
                        >
                          {valid ? 'Válida' : 'Expirada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {license.licenseExpiresAt 
                          ? format(new Date(license.licenseExpiresAt), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Sem prazo'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <HardDrive className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma licença em cache.</p>
            <p className="text-sm">Clique em "Sincronizar" para baixar os dados.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
