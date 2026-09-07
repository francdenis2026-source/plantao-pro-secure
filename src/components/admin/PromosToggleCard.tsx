import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Megaphone } from 'lucide-react';
import { usePromosEnabled } from '@/hooks/usePromosEnabled';
import { toast } from '@/hooks/use-toast';

export function PromosToggleCard() {
  const { enabled, loading, setPromosEnabled } = usePromosEnabled();

  const handleToggle = async (next: boolean) => {
    try {
      await setPromosEnabled(next);
      toast({
        title: next ? 'Promoções ativadas' : 'Promoções desativadas',
        description: next
          ? 'Os banners promocionais estão visíveis para os agentes.'
          : 'Os banners promocionais foram ocultados globalmente.',
      });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao atualizar', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-amber-500" />
          Banners Promocionais
        </CardTitle>
        <CardDescription>
          Controle global de exibição dos banners promocionais no painel do agente. Desativados por padrão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="promos-toggle" className="text-sm font-medium">
              Exibir promoções para agentes
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando desativado, nenhum banner promocional é renderizado.
            </p>
          </div>
          <Switch
            id="promos-toggle"
            checked={enabled}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
