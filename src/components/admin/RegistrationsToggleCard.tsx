import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useRegistrationsEnabled } from '@/hooks/useRegistrationsEnabled';
import { toast } from '@/hooks/use-toast';

export function RegistrationsToggleCard() {
  const { enabled, loading, setRegistrationsEnabled } = useRegistrationsEnabled();

  const handleToggle = async (next: boolean) => {
    try {
      await setRegistrationsEnabled(next);
      toast({
        title: next ? 'Novos cadastros liberados' : 'Novos cadastros bloqueados',
        description: next
          ? 'Agentes com matrícula não cadastrada agora podem se cadastrar normalmente.'
          : 'Quem tentar se cadastrar verá um aviso pedindo para procurar o administrador.',
      });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao atualizar', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Novos Cadastros
        </CardTitle>
        <CardDescription>
          Controle global do autocadastro de agentes na tela inicial. Ativado por padrão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="registrations-toggle" className="text-sm font-medium">
              Permitir novos cadastros
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando desativado, uma matrícula ainda não cadastrada não abre o formulário de
              cadastro — o agente vê um aviso pedindo para procurar o administrador.
            </p>
          </div>
          <Switch
            id="registrations-toggle"
            checked={enabled}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
