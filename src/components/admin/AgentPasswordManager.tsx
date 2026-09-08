import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Key, Eye, EyeOff, RefreshCw, Loader2, Shield, Copy, Check } from 'lucide-react';
import { formatCPF } from '@/lib/validators';

interface AgentPasswordManagerProps {
  agent: {
    id: string;
    name: string;
    cpf: string | null;
    email: string | null;
  };
  onSuccess?: () => void;
}

export function AgentPasswordManager({ agent, onSuccess }: AgentPasswordManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
  };

  const copyToClipboard = async () => {
    if (newPassword) {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copiado!', description: 'Senha copiada para a área de transferência.' });
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ 
        title: 'Erro', 
        description: 'A senha deve ter pelo menos 6 caracteres.', 
        variant: 'destructive' 
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ 
        title: 'Erro', 
        description: 'As senhas não conferem.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the admin-operations edge function to reset password securely
      const { adminClient } = await import('@/lib/adminClient');
      const result = await adminClient.resetPassword({ 
        agentId: agent.id, 
        newPassword 
      });

      // Log the action (best-effort)
      try {
        await supabase.from('access_logs').insert({
          agent_id: agent.id,
          action: 'password_reset_by_admin',
        });
      } catch {
        // ignore logging errors
      }

      // Show appropriate message based on result
      const wasCreated = (result as any)?.created;
      toast({ 
        title: wasCreated ? 'Usuário Criado' : 'Senha Redefinida', 
        description: wasCreated 
          ? `Credenciais criadas para ${agent.name}. Informe a nova senha ao agente.`
          : `Nova senha definida para ${agent.name}. Informe ao agente.`
      });
      
      setOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Não foi possível redefinir a senha.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
          title="Gerenciar Senha"
        >
          <Key className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            Gerenciar Credenciais
          </DialogTitle>
          <DialogDescription>
            Visualize e redefina a senha de acesso do agente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Agente:</span>
              <span className="font-bold text-foreground">{agent.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">CPF:</span>
              <Badge variant="outline" className="font-mono">
                {agent.cpf ? formatCPF(agent.cpf) : 'Não informado'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Login:</span>
              <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                {agent.cpf || 'CPF'}
              </code>
            </div>
          </div>

          {/* Password Reset */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Nova Senha</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateRandomPassword}
                className="h-8 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Gerar Senha
              </Button>
            </div>
            
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-20"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={copyToClipboard}
                  disabled={!newPassword}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Confirmar Senha</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400">As senhas não conferem</p>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
            <p className="text-amber-400 font-semibold">⚠️ Atenção</p>
            <p className="text-muted-foreground text-xs mt-1">
              Após redefinir a senha, informe o agente sobre a nova credencial. 
              A senha antiga será invalidada imediatamente.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleResetPassword}
            disabled={isLoading || !newPassword || newPassword !== confirmPassword}
            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redefinindo...</>
            ) : (
              <><Key className="h-4 w-4 mr-2" /> Redefinir Senha</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
