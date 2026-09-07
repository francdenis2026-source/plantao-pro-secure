import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Database, Plus, Trash2, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ExternalConfig {
  id: string;
  name: string;
  supabase_url: string;
  supabase_anon_key: string;
  is_active: boolean;
  created_at: string;
}

export function ExternalDatabaseConfig() {
  const [configs, setConfigs] = useState<ExternalConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    supabase_url: '',
    supabase_anon_key: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('external_database_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.name || !newConfig.supabase_url || !newConfig.supabase_anon_key) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('external_database_configs').insert({
        name: newConfig.name,
        supabase_url: newConfig.supabase_url,
        supabase_anon_key: newConfig.supabase_anon_key,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configuração adicionada com sucesso.',
      });
      
      setNewConfig({ name: '', supabase_url: '', supabase_anon_key: '' });
      setIsAddDialogOpen(false);
      fetchConfigs();
    } catch (error: any) {
      console.error('Error adding config:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível adicionar a configuração.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (config: ExternalConfig) => {
    try {
      // If activating, deactivate all others first
      if (!config.is_active) {
        await supabase
          .from('external_database_configs')
          .update({ is_active: false })
          .neq('id', config.id);
      }

      const { error } = await supabase
        .from('external_database_configs')
        .update({ is_active: !config.is_active })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: config.is_active ? 'Desativado' : 'Ativado',
        description: `Banco ${config.name} ${config.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      });
      
      fetchConfigs();
    } catch (error) {
      console.error('Error toggling config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a configuração.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('external_database_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Removido',
        description: 'Configuração removida com sucesso.',
      });
      
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a configuração.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-white">Bancos de Dados Externos</CardTitle>
              <CardDescription className="text-slate-400">
                Configure conexões com projetos Supabase externos
              </CardDescription>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Adicionar Banco Externo</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Configure a conexão com um projeto Supabase externo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="config-name" className="text-slate-300">Nome</Label>
                  <Input
                    id="config-name"
                    placeholder="Ex: Produção, Backup..."
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supabase-url" className="text-slate-300">Supabase URL</Label>
                  <Input
                    id="supabase-url"
                    placeholder="https://xxxxx.supabase.co"
                    value={newConfig.supabase_url}
                    onChange={(e) => setNewConfig({ ...newConfig, supabase_url: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anon-key" className="text-slate-300">Anon Key</Label>
                  <Input
                    id="anon-key"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={newConfig.supabase_anon_key}
                    onChange={(e) => setNewConfig({ ...newConfig, supabase_anon_key: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white font-mono text-xs"
                  />
                  <p className="text-xs text-slate-500">
                    Encontre no painel do Supabase: Settings → API → Project API keys
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="text-slate-400"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddConfig}
                  disabled={isSaving}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {configs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma configuração externa cadastrada</p>
            <p className="text-xs mt-1">Adicione um banco de dados Supabase externo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`p-4 rounded-lg border ${
                  config.is_active 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-slate-700/30 border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">{config.name}</h4>
                      {config.is_active && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-md">
                      {config.supabase_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={() => handleToggleActive(config)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteConfig(config.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">
            <strong className="text-amber-500">Nota:</strong> A funcionalidade de banco externo está em desenvolvimento.
            As configurações serão usadas em futuras versões para sincronização de dados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
