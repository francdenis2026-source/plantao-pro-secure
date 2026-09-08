import { useState } from 'react';
import { adminClient } from '@/lib/adminClient';
import { useAuth } from '@/contexts/AuthContext';
import { getMasterToken } from '@/lib/masterSession';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, ShieldAlert } from 'lucide-react';

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
  onSuccess: () => void;
}

export function DeleteUserDialog({ userId, userName, onSuccess }: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user, userRole, masterSession } = useAuth();

  const isSelfDeletion = user?.id === userId;
  const isAdmin = userRole === 'admin' || userRole === 'master' || !!masterSession || !!getMasterToken();
  const cannotDelete = isSelfDeletion && isAdmin;

  const handleDelete = async () => {
    if (cannotDelete) {
      toast({
        title: 'Ação não permitida',
        description: 'Administradores não podem excluir sua própria conta.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      await adminClient.deleteAgent({ agentId: userId });

      toast({
        title: 'Usuário excluído',
        description: `${userName} foi removido do sistema.`,
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (cannotDelete) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        disabled 
        className="text-muted-foreground cursor-not-allowed opacity-50"
        title="Administradores não podem excluir sua própria conta"
      >
        <ShieldAlert className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Excluir Usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Excluir <strong className="text-foreground">{userName}</strong>? Esta ação é permanente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
