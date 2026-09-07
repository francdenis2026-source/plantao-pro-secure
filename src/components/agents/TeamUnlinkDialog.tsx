import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft, ShieldAlert } from 'lucide-react';

interface TeamUnlinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  currentTeam: string | null;
  currentUnitName: string | null;
  onSuccess: () => void;
  onRequestTransfer: () => void;
}

export function TeamUnlinkDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
  currentTeam,
  currentUnitName,
  onSuccess,
  onRequestTransfer,
}: TeamUnlinkDialogProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();
  useAuth();

  const handleUnlink = async () => {
    toast({
      title: 'Ação não permitida',
      description: 'A exclusão de conta pelo próprio usuário está desativada. Solicite ao Master.',
      variant: 'destructive',
    });
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    return (
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">⚠️ Exclusão desativada</AlertDialogTitle>
            <AlertDialogDescription>
            <p className="mb-2">A auto-exclusão foi desativada por segurança.</p>
            <p className="text-muted-foreground">Apenas o Master pode excluir/editar contas.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
            Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Gerenciar Equipe</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block mb-2">
              Equipe <strong>{currentTeam}</strong>{currentUnitName && ` - ${currentUnitName}`}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex flex-col gap-2 py-2">
          <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => { onOpenChange(false); onRequestTransfer(); }}>
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <span className="text-sm">Solicitar Transferência</span>
          </Button>
          
          <Button
            variant="outline"
            disabled
            className="justify-start gap-2 h-auto py-3 opacity-50"
          >
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              Exclusão de conta: somente Master
            </span>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
