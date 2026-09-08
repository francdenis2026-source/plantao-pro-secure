import { useEffect, useState, useCallback } from 'react';
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
import { Save, X } from 'lucide-react';

interface UnsavedChangesDialogProps {
  hasUnsavedChanges: boolean;
  onSave?: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  open: boolean;
  showSaveOption?: boolean;
}

export function UnsavedChangesDialog({
  hasUnsavedChanges,
  onSave,
  onDiscard,
  onCancel,
  open,
  showSaveOption = true,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem dados não salvos. O que deseja fazer?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancel}>
            Continuar Editando
          </AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={onDiscard}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Descartar
          </Button>
          {showSaveOption && onSave && (
            <Button 
              onClick={onSave}
              className="gap-2 bg-gradient-primary"
            >
              <Save className="h-4 w-4" />
              Salvar e Sair
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook to detect unsaved changes and prevent accidental navigation
export function useUnsavedChanges(hasChanges: boolean) {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Handle browser back button and page refresh
  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  // Handle ESC key - only close if no changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hasChanges) {
        e.preventDefault();
        setShowExitDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [hasChanges]);

  const requestClose = useCallback((closeAction: () => void) => {
    if (hasChanges) {
      setPendingAction(() => closeAction);
      setShowExitDialog(true);
    } else {
      closeAction();
    }
  }, [hasChanges]);

  const confirmClose = useCallback(() => {
    setShowExitDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const cancelClose = useCallback(() => {
    setShowExitDialog(false);
    setPendingAction(null);
  }, []);

  return {
    showExitDialog,
    setShowExitDialog,
    requestClose,
    confirmClose,
    cancelClose,
  };
}
