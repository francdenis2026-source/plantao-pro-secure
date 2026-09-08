import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldAlert } from 'lucide-react';
import { useWelcomeHintEnabled } from '@/hooks/useWelcomeHintEnabled';
import { toast } from '@/hooks/use-toast';

export function WelcomeHintToggleCard() {
  const { enabled, loading, setWelcomeHintEnabled } = useWelcomeHintEnabled();

  const handleToggle = async (next: boolean) => {
    try {
      await setWelcomeHintEnabled(next);
      toast({
        title: next ? 'Aviso de boas-vindas ativado' : 'Aviso de boas-vindas desativado',
        description: next
          ? 'Agentes verão o lembrete de troca da senha padrão no primeiro acesso.'
          : 'Nenhum aviso de boas-vindas será exibido aos agentes ao entrar.',
      });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao atualizar', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Aviso de Boas-vindas (Senha Padrão)
        </CardTitle>
        <CardDescription>
          Controle global do modal exibido no primeiro login orientando a troca da senha padrão (CPF). Desativado por padrão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="welcome-hint-toggle" className="text-sm font-medium">
              Exibir aviso de boas-vindas
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando desativado, o modal nunca é renderizado, mesmo em primeiro acesso.
            </p>
          </div>
          <Switch
            id="welcome-hint-toggle"
            checked={enabled}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
