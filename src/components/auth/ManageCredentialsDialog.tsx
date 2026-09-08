import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, User, Key, KeyRound, AlertTriangle } from 'lucide-react';
import { formatCPF } from '@/lib/validators';
import { 
  getSavedCredentials, 
  removeCredential, 
  removeCredentialPassword, 
  clearAllCredentials 
} from './SavedCredentials';

interface SavedCredential {
  cpf: string;
  name?: string;
  password?: string;
  savedAt: string;
}

interface ManageCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageCredentialsDialog = ({ open, onOpenChange }: ManageCredentialsDialogProps) => {
  const [credentials, setCredentials] = useState<SavedCredential[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (open) {
      setCredentials(getSavedCredentials());
      setConfirmClearAll(false);
    }
  }, [open]);

  const handleRemove = (cpf: string) => {
    removeCredential(cpf);
    setCredentials(getSavedCredentials());
  };

  const handleRemovePassword = (cpf: string) => {
    removeCredentialPassword(cpf);
    setCredentials(getSavedCredentials());
  };

  const handleClearAll = () => {
    if (confirmClearAll) {
      clearAllCredentials();
      setCredentials([]);
      setConfirmClearAll(false);
      onOpenChange(false);
    } else {
      setConfirmClearAll(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <KeyRound className="h-5 w-5 text-primary" />
            Gerenciar Credenciais Salvas
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Gerencie os CPFs e senhas salvos neste dispositivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {credentials.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Nenhuma credencial salva
              </p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Ao fazer login, você pode optar por salvar seu CPF e senha
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {credentials.map((cred) => (
                  <div
                    key={cred.cpf}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-foreground">
                          {formatCPF(cred.cpf)}
                        </p>
                        {cred.name && (
                          <p className="text-xs text-muted-foreground">
                            {cred.name}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {cred.password && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded flex items-center gap-1">
                              <Key className="h-2.5 w-2.5" />
                              Senha salva
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            Salvo em {new Date(cred.savedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {cred.password && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePassword(cred.cpf)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                          title="Remover apenas a senha"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(cred.cpf)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remover CPF e senha"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border">
                {confirmClearAll ? (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">
                        Confirmar exclusão?
                      </p>
                      <p className="text-xs text-destructive/80">
                        Isso removerá todas as credenciais salvas
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmClearAll(false)}
                        className="h-7 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-7 text-xs"
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleClearAll}
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar todas as credenciais
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
