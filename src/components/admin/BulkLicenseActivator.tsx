import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Loader2, 
  Check, 
  AlertTriangle,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';

interface ActivationResult {
  success: boolean;
  affected_count?: number;
  duration_days?: number;
  code_description?: string;
  error?: string;
}

interface BulkLicenseActivatorProps {
  onActivated?: () => void;
}

export function BulkLicenseActivator({ onActivated }: BulkLicenseActivatorProps) {
  const [code, setCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const { toast } = useToast();

  const activateLicenses = async () => {
    if (!code.trim()) {
      toast({
        title: 'Código necessário',
        description: 'Digite o código de ativação.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActivating(true);
      setResult(null);

      const { data, error } = await supabase.rpc('activate_license_with_code', {
        p_code: code.toUpperCase().trim(),
        p_agent_id: null, // null = ativar para todos
      });

      if (error) throw error;

      const resultData = data as unknown as ActivationResult;
      setResult(resultData);

      if (resultData.success) {
        toast({
          title: 'Licenças ativadas!',
          description: `${resultData.affected_count} licenças renovadas por ${resultData.duration_days} dias.`,
        });
        setCode('');
        onActivated?.();
      } else {
        toast({
          title: 'Falha na ativação',
          description: resultData.error || 'Código inválido ou expirado.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error activating licenses:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a ativação.',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-emerald-900/20 to-slate-900/60 border-emerald-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Zap className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-white">Ativação em Massa</CardTitle>
            <CardDescription>
              Use um código para renovar todas as licenças de uma vez
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Código de Ativação</Label>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Digite o código..."
              className="bg-slate-800 border-slate-700 uppercase font-mono text-lg tracking-widest"
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && activateLicenses()}
            />
            <Button 
              onClick={activateLicenses} 
              disabled={activating || !code.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {activating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ativar
                </>
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {result.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="h-5 w-5" />
                  <span className="font-semibold">Ativação concluída!</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{result.affected_count} licenças renovadas</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>+{result.duration_days} dias</span>
                  </div>
                </div>
                {result.code_description && (
                  <p className="text-sm text-slate-400 mt-2">
                    {result.code_description}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{result.error || 'Falha na ativação'}</span>
              </div>
            )}
          </div>
        )}

        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Como funciona:</strong> Insira o código de ativação 
            fornecido pelo administrador. Todas as licenças ativas serão renovadas 
            automaticamente pelo período especificado no código.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
