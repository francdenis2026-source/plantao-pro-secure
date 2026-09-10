import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';
import { useRoundsRequireAuth } from '@/hooks/useRoundsRequireAuth';
import { toast } from '@/hooks/use-toast';

export function RoundsAccessToggleCard() {
  const { requireAuth, loading, setRoundsRequireAuth } = useRoundsRequireAuth();

  const handleToggle = async (next: boolean) => {
    try {
      await setRoundsRequireAuth(next);
      toast({
        title: next ? 'Gestor de Rondas restrito a agentes logados' : 'Gestor de Rondas com acesso livre',
        description: next
          ? 'Quem não estiver logado verá um aviso pedindo para entrar no sistema antes de usar a ferramenta.'
          : 'A ferramenta volta a ficar acessível mesmo sem login.',
      });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao atualizar', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Acesso ao Gestor de Rondas
        </CardTitle>
        <CardDescription>
          Controle global de quem pode abrir a ferramenta de rondas. Desativado por padrão (acesso livre).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="rounds-auth-toggle" className="text-sm font-medium">
              Exigir login para usar o Gestor de Rondas
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando ativado, um usuário não logado que tentar abrir a ferramenta vê um aviso
              pedindo para entrar no sistema, em vez do painel de rondas.
            </p>
          </div>
          <Switch
            id="rounds-auth-toggle"
            checked={requireAuth}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
